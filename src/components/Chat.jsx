import React, { useEffect, useRef, useState } from 'react';
import { FaTimes, FaInfoCircle } from 'react-icons/fa';
import { BsFileEarmarkArrowUp } from 'react-icons/bs';
import { useLocalContext } from '../context/context';
import db, { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Firebase Storage
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { GoogleOutlined } from '@ant-design/icons';
import { Button, Col, Row } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import { useParams } from 'react-router-dom';
import { Tooltip } from 'antd';

const Chat = ({ isSidebarOpen }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [inputText, setInputText] = useState('');
  const [selectedButton, setSelectedButton] = useState('Patient History');
  const [uploading, setUploading] = useState(false);
  const [rewrittenPdfUrl, setRewrittenPdfUrl] = useState(null); // New state to store rewritten PDF URL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false); // New state for "Sign in with Google" modal
  const { user, setUser } = useLocalContext();
  const modalRef = useRef(null);

  const { id } = useParams();
  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        try {
          const docRef = doc(db, 'uploads', id); // Reference to the document
          const docSnap = await getDoc(docRef); // Fetch the document

          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log(data);
            // Update state variables based on the fetched data
            setSelectedFile({ name: data.fileName });
            setInputText(data.prompt || ''); // Set the input text if any prompt exists
            setSelectedButton(data.summaryType);
            setRewrittenPdfUrl(data.responsePdf); // Set the URL of the rewritten PDF
          } else {
            console.log('No such document!');
          }
        } catch (error) {
          console.error('Error fetching document:', error);
        }
      }
    };

    fetchData();
  }, [id]);

  const handleFileUpload = (event) => {
    setSelectedFile(event.target.files[0]);
    setRewrittenPdfUrl(null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleInputChange = (event) => {
    setInputText(event.target.value);
  };

  const handleButtonClick = (buttonId) => {
    setSelectedButton(buttonId);
  };

  const handleSendClick = async () => {
    if (!user) {
      setIsSignInModalOpen(true); // Show the "Sign in with Google" modal if the user is not logged in
      return;
    }

    const formData = new FormData();
    formData.append('pdf_file', selectedFile);

    let prompt = '';
    if (selectedButton === 'Patient History') {
      prompt = inputText || "Write a detailed summary based on the following steps please ensure that no medications or information is lost .Patient Information Name:Date of Birth:Gender:Medicare/Insurance ID:Primary Care Physician:Emergency Contact:Name:Phone Number:Hospital Discharge InformationHospital Name:Date of Admission:Date of Discharge:Reason for Admission:Discharge Diagnosis:Primary Diagnosis: (Include ICD-10 Code)Secondary Diagnoses: (Include ICD-10 Codes)Discharge Summary:Brief overview of treatments received, condition at discharge, and care plan at discharge.Note any hospital-related complications.Medical History Chronic Conditions:List ongoing conditions (e.g., diabetes, hypertension) with ICD-10 Codes.Surgical History:List past surgeries and dates.Allergies:List known allergies, particularly to medications.MedicationsCurrent Medications (Link each medication to ICD-10 diagnosis for clear justification of treatment):Medication Name | Dosage | Frequency | RouteExample: Metformin | 500 mg | Twice daily | OralChanges in Medications:Document medication changes during hospitalization, with reasons.Medication Reconciliation:Ensure accurate post-discharge medications match patient’s care needs.Treatment and ProceduresKey Procedures During Hospital Stay:Document any significant procedures (e.g., surgeries, catheter placements) and outcomes.Wound Care:Document wound/incision details, including type, size, location, and recommended care.Functional Status Mobility:Describe patient’s mobility (e.g., independent, requires assistance with walking, or bedridden).Activities of Daily Living (ADLs):List abilities in bathing, dressing, feeding, toileting, and indicate level of assistance required.Cognitive Function:Document orientation, memory, and ability to follow instructions (alert, confused, forgetful).Vital Signs at Discharge Temperature:Pulse:Respiration Rate:Blood Pressure:Oxygen Saturation:Note whether oxygen is required for home care and amount of oxygen (e.g., 2L via nasal cannula).Lab and Diagnostic Test Results Significant Lab Results:Include only abnormal results and trends related to the patient's ongoing care.Imaging/Diagnostics:Summarize key findings (e.g., X-rays, MRIs, CT scans) pertinent to home care.Care Plan and Follow-Up Discharge Care Instructions:Include specific instructions related to wound care, medication administration, and ADL assistance.Dietary Restrictions:Note special diets or restrictions (e.g., diabetic, low-sodium).Activity Restrictions:Physical activity limitations (e.g., no lifting over 10 lbs, bed rest).Home Equipment Needs:Document any home medical equipment needed (e.g., oxygen, walkers, hospital beds).Follow-Up Appointments:Document date, time, and provider for upcoming visits (e.g., primary care, specialist).Home Health Goals:Clearly define short-term and long-term goals to track progress in OASIS submissions (e.g., wound healing, improving mobility, medication adherence).OASIS and PCR Submissions OASIS (Outcome and Assessment Information Set):Highlight areas critical for the OASIS submission, particularly focusing on ADLs, mobility, wound care, and cognitive function.Include detailed clinical assessment findings that will inform accurate OASIS scoring (e.g., ability to bathe, walk, cognitive status)."; // Your full prompt
    } else if (selectedButton === 'Differential Diagnosis') {
      prompt = inputText || "Write a detailed summary of non clinical plan of care from the information provided here in the text. Include all the neccessary steps to ensure patient care in terms of diet, exercise, therapy, couselling etc"; // Your full prompt
    }

    formData.append('prompt', prompt);

    try {
      setUploading(true);
      const response = await fetch('http://18.225.57.61:7860/rewrite_pdf', {
        method: 'POST',
        body: formData,
      });

      let rewrittenBlob;
      let rewrittenPdfUrl;
      const uploadId = uuidv4(); // Generate a unique ID for the upload
      if (response.ok) {
        rewrittenBlob = await response.blob();

        // Upload the rewritten PDF blob to Firebase Storage
        const rewrittenPdfStorageRef = ref(storage, `rewritten_pdfs/${uploadId}.pdf`);
        await uploadBytes(rewrittenPdfStorageRef, rewrittenBlob);

        // Get Firebase Storage URL for the rewritten PDF
        rewrittenPdfUrl = await getDownloadURL(rewrittenPdfStorageRef);
        setRewrittenPdfUrl(rewrittenPdfUrl);  // Set the Firebase URL for displaying the rewritten PDF
      } else {
        console.error('Error from API');
      }

      // Upload the original PDF to Firebase Storage
      const storageRef = ref(storage, `uploads/${uploadId}/${selectedFile.name}/${selectedButton}`);
      const uploadResult = await uploadBytes(storageRef, selectedFile);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // Save data to Firestore
      const docRef = doc(db, `uploads/${uploadId}`); // Save under uploads/uuid
      await setDoc(docRef, {
        email: user.email,
        summaryType: selectedButton,
        uploadedAt: new Date(),
        responsePdf: rewrittenPdfUrl,  // Firebase URL for the rewritten PDF
        filePath: uploadResult.ref.fullPath,
        fileName: selectedFile.name,
        downloadUrl: downloadUrl  // Firebase download URL for the uploaded file
      });
      console.log('Data successfully saved to Firestore');
    } catch (error) {
      console.error('Error occurred while sending request:', error);
    } finally {
      setUploading(false);
    }
  };


  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const toggleSignInModal = () => {
    setIsSignInModalOpen(!isSignInModalOpen); // Toggle the "Sign in with Google" modal
  };
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user); // Update user context with signed-in user
      toggleSignInModal(); // Close modal after successful sign-in
    } catch (error) {
      console.error('Error during sign in:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsSignInModalOpen(false); // Close modal if clicked outside
      }
    };

    if (isModalOpen) {
      window.addEventListener('mousedown', handleClickOutside); // Add event listener
    } else {
      window.removeEventListener('mousedown', handleClickOutside); // Cleanup on modal close
    }

    return () => {
      window.removeEventListener('mousedown', handleClickOutside); // Cleanup on unmount
    };
  }, [isSignInModalOpen]);


  return (
    <div className="flex flex-col h-full bg-gray-50 shadow-lg rounded-md sm:pt-[18vh]">
      {/* Content Area (scrollable) */}
      <div className="flex-grow overflow-y-auto p-6 pb-[30vh]">
        <div className="mb-2">
          <p className="font-semibold text-center text-xl mb-4">Input a Patient Summary</p>
          <p className="text-justify sm:w-[64vw] mx-auto mb-4">
            Include age, sex, relevant past medical history, medications, presenting symptoms, associated symptoms, etc.
          </p>
        </div>

        {/* File Upload and Input */}
        {selectedFile && (
          <div className="flex items-center justify-between border border-gray-300 bg-gray-100 p-3 rounded-md mb-4">
            <span className="text-gray-800 font-semibold">{selectedFile.name}</span>
            <FaTimes className="text-gray-500 cursor-pointer" onClick={handleRemoveFile} />
          </div>
        )}

        {/* PDF Viewer Block */}
        {/* PDF Viewer Block */}
        {rewrittenPdfUrl && (
          <div className="mt-4">
            <p className="font-semibold mb-2">Rewritten PDF:</p>
            <div className="border border-gray-300 p-4 bg-white rounded-md mb-4" style={{ height: '500px', overflowY: 'auto' }}>
              {/* Ensure the `src` has a valid Blob URL and iframe has proper width/height */}
              <iframe
                src={rewrittenPdfUrl}
                className="w-full h-full"
                title="Rewritten PDF"
                style={{ minHeight: '500px', width: '100%' }} // Set min height and width explicitly
              />
            </div>
            <a href={rewrittenPdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              Click here to download the PDF
            </a>
          </div>
        )}


      </div>

      {/* Fixed Input and Action Area */}
      <div className={`bg-white shadow p-4 border-t fixed right-0 bottom-0 ${isSidebarOpen ? 'left-[16vw]' : 'left-0'} transition-all`}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md border-gray-300 flex-grow h-full">
              <label className="flex items-center cursor-pointer p-2">
                <BsFileEarmarkArrowUp className="text-gray-400 text-xl" />
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf"
                />
              </label>
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Type a message or upload a file"
                className="flex-grow p-2 outline-none h-full"
              />
            </div>
            <button
              onClick={handleSendClick}
              className="bg-[#015BA3] text-white font-semibold px-4 py-2 rounded-md h-full"
              disabled={!selectedFile || uploading}
            >
              {uploading ? 'Uploading...' : 'Send'}
            </button>
          </div>

          {/* Action Buttons for Summary Selection */}
          <div className="grid grid-cols-2 gap-2">
            {['Patient History', 'Differential Diagnosis'].map((text, index) => {
              const isDifferentialDiagnosis = text === 'Differential Diagnosis';

              return (
                <Tooltip
                  key={index}
                  title={isDifferentialDiagnosis ? 'Coming Soon' : ''} // Tooltip only for "Differential Diagnosis"
                  placement="top"
                >
                  <button
                    key={index}
                    onClick={() => !isDifferentialDiagnosis && handleButtonClick(text)} // Disable onClick for Differential Diagnosis
                    disabled={isDifferentialDiagnosis} // Disable the button
                    className={`p-2 border rounded-md ${selectedButton === text
                        ? 'bg-[#015BA3] text-white border-[#015BA3]'  // Active state
                        : isDifferentialDiagnosis
                          ? 'bg-gray-400 text-gray-200 border-gray-400 cursor-not-allowed'  // Disabled state for Differential Diagnosis
                          : 'bg-white text-[#015BA3] border-[#015BA3]'
                      }`}
                    style={{ cursor: isDifferentialDiagnosis ? 'not-allowed' : 'pointer' }} // Change cursor to not-allowed for disabled button
                  >
                    {text}
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {/* Disclaimer Link */}
          <p className="text-gray-500 text-sm mt-2 text-center">
            <button onClick={toggleModal} className="text-blue-500 underline">
              Disclaimer
            </button>
          </p>
        </div>
      </div>

      {/* Modal for "Sign in with Google" */}
      {isSignInModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-md w-[90vw] md:w-[30vw]" ref={modalRef}>
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4 text-black">Sign in to your account</h2>
              <p className="text-gray-500 mb-8">Generate Reports and more!</p>
              <Row gutter={[16, 16]} justify="center">
                <Col span={24}>
                  <Button
                    type="primary"
                    className="w-full"
                    style={{ backgroundColor: '#db4437', borderColor: '#db4437' }}
                    icon={<GoogleOutlined />}
                    onClick={handleGoogleSignIn}
                  >
                    Sign in with Google
                  </Button>
                </Col>
              </Row>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-md shadow-md w-[90vw] md:w-[40vw]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Disclaimer</h2>
              <FaTimes className="cursor-pointer text-gray-500" onClick={toggleModal} />
            </div>
            {/* Add a fixed height and make the content scrollable */}
            <div className="text-sm text-gray-700 h-64 overflow-y-auto">
              <p>
                Protego Health AI Clinical Decision Support Platform Terms of Use

                Purpose and Functionality
                The Protego Health AI Clinical Decision Support (CDS) platform is specifically designed to augment the clinical decision-making processes of healthcare professionals. The platform's functionalities include the generation of preliminary drafts for differential diagnoses, clinical assessments, treatment plans, and responses to clinical reference inquiries.

                Recommendation and Review
                All outputs generated by the AI CDS serve as preliminary recommendations intended for independent review by the clinician user. These outputs are to be utilized as draft recommendations, requiring detailed review and validation by the clinician. The AI CDS platform's core features are intended solely as a supplementary tool to support clinical reasoning and must not replace or override the professional judgment of clinicians.

                Platform Development and Limitations
                Protego Health is committed to the continuous development of the AI CDS platform while recognizing and addressing its current limitations. The mission is to empower clinicians with a leading-edge AI CDS platform and improve patient outcomes globally.

                Bias and Equity Considerations
                Large language models, such as those utilized in the AI CDS platform, inherently possess limitations, including the potential to perpetuate biases derived from pre-training, fine-tuning, and user input. Protego Health has made extensive efforts to mitigate the perpetuation of harmful biases. As part of our commitment to safety, equity, and alignment in the deployment of AI CDS globally, users are advised to omit elements of clinical scenarios related to race, ethnicity, sexual orientation, gender, socio-economic status, disabilities, age, geographical location, and language or cultural background when utilizing the AI CDS. The prevention of bias perpetuation and the promotion of health equity are fundamental components of Protego Health's mission.

                Restrictions on Use
                The Protego Health AI CDS platform is explicitly not intended for use by patients. Users are strictly prohibited from employing this platform for personal health advice or as a substitute for professional medical consultation. The platform provides recommendations intended to assist clinicians in their clinical decision-making processes. AI-generated responses necessitate the expertise of a qualified clinician for accurate interpretation, as they often encompass a broad spectrum of potential diagnoses, diagnostic options, and therapeutic considerations within the context of probabilistic clinical reasoning.
              </p>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={toggleModal} className="bg-[#015BA3] text-white px-4 py-2 rounded-md">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Chat;