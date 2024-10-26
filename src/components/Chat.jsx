import React, { useEffect, useRef, useState } from 'react';
import { FaTimes, FaInfoCircle } from 'react-icons/fa';
import { BsFileEarmarkArrowUp } from 'react-icons/bs';
import { useLocalContext } from '../context/context';
import db, { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { GoogleOutlined } from '@ant-design/icons';
import { Button, Col, Row, Spin, Tooltip } from 'antd';
import { v4 as uuidv4 } from 'uuid';
import { useParams } from 'react-router-dom';

const Chat = ({ isSidebarOpen }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedButton, setSelectedButton] = useState('Patient History');
  const [uploading, setUploading] = useState(false);
  const [rewrittenText, setRewrittenText] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const { user, setUser } = useLocalContext();
  const [loadingDiv, setLoadingDiv] = useState(false);
  const rewrittenTextRef = useRef();
  const { id } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        try {
          const docRef = doc(db, 'uploads', id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setSelectedFiles([{ name: data.fileName }]);
            setInputText(data.prompt || '');
            setSelectedButton(data.summaryType);
            setRewrittenText(data.responseText);
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
    const files = Array.from(event.target.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
    setRewrittenText(null);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleInputChange = (event) => {
    setInputText(event.target.value);
  };

  const handleButtonClick = (buttonId) => {
    setSelectedButton(buttonId);
  };

  const handleSendClick = async () => {
    if (!user) {
      setIsSignInModalOpen(true);
      return;
    }

    setLoadingDiv(true);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('pdfs', file);
    });

    let prompt = '';
    if (selectedButton === 'Patient History') {
      prompt = inputText || "Write a detailed summary based on the following steps please ensure that no medications or information is lost .Patient Information Name:Date of Birth:Gender:Medicare/Insurance ID:Primary Care Physician:Emergency Contact:Name:Phone Number:Hospital Discharge InformationHospital Name:Date of Admission:Date of Discharge:Reason for Admission:Discharge Diagnosis:Primary Diagnosis: (Include ICD-10 Code)Secondary Diagnoses: (Include ICD-10 Codes)Discharge Summary:Brief overview of treatments received, condition at discharge, and care plan at discharge.Note any hospital-related complications.Medical History Chronic Conditions:List ongoing conditions (e.g., diabetes, hypertension) with ICD-10 Codes.Surgical History:List past surgeries and dates.Allergies:List known allergies, particularly to medications.MedicationsCurrent Medications (Link each medication to ICD-10 diagnosis for clear justification of treatment):Medication Name | Dosage | Frequency | RouteExample: Metformin | 500 mg | Twice daily | OralChanges in Medications:Document medication changes during hospitalization, with reasons.Medication Reconciliation:Ensure accurate post-discharge medications match patient’s care needs.Treatment and ProceduresKey Procedures During Hospital Stay:Document any significant procedures (e.g., surgeries, catheter placements) and outcomes.Wound Care:Document wound/incision details, including type, size, location, and recommended care.Functional Status Mobility:Describe patient’s mobility (e.g., independent, requires assistance with walking, or bedridden).Activities of Daily Living (ADLs):List abilities in bathing, dressing, feeding, toileting, and indicate level of assistance required.Cognitive Function:Document orientation, memory, and ability to follow instructions (alert, confused, forgetful).Vital Signs at Discharge Temperature:Pulse:Respiration Rate:Blood Pressure:Oxygen Saturation:Note whether oxygen is required for home care and amount of oxygen (e.g., 2L via nasal cannula).Lab and Diagnostic Test Results Significant Lab Results:Include only abnormal results and trends related to the patient's ongoing care.Imaging/Diagnostics:Summarize key findings (e.g., X-rays, MRIs, CT scans) pertinent to home care.Care Plan and Follow-Up Discharge Care Instructions:Include specific instructions related to wound care, medication administration, and ADL assistance.Dietary Restrictions:Note special diets or restrictions (e.g., diabetic, low-sodium).Activity Restrictions:Physical activity limitations (e.g., no lifting over 10 lbs, bed rest).Home Equipment Needs:Document any home medical equipment needed (e.g., oxygen, walkers, hospital beds).Follow-Up Appointments:Document date, time, and provider for upcoming visits (e.g., primary care, specialist).Home Health Goals:Clearly define short-term and long-term goals to track progress in OASIS submissions (e.g., wound healing, improving mobility, medication adherence).OASIS and PCR Submissions OASIS (Outcome and Assessment Information Set):Highlight areas critical for the OASIS submission, particularly focusing on ADLs, mobility, wound care, and cognitive function.Include detailed clinical assessment findings that will inform accurate OASIS scoring (e.g., ability to bathe, walk, cognitive status).";
    } else if (selectedButton === 'Differential Diagnosis') {
      prompt = inputText || "Write a detailed summary of non clinical plan of care from the information provided here in the text. Include all the necessary steps to ensure patient care in terms of diet, exercise, therapy, counseling etc";
    }

    formData.append('prompt', prompt);

    try {
      setUploading(true);

      const mergeResponse = await fetch('http://18.225.57.61:7865/merge_pdfs', {
        method: 'POST',
        body: formData,
      });

      if (mergeResponse.ok) {
        const mergedPdfBlob = await mergeResponse.blob();

        const rewriteFormData = new FormData();
        rewriteFormData.append('pdf_file', mergedPdfBlob, 'merged_summary.pdf');
        rewriteFormData.append('prompt', prompt);

        const rewriteResponse = await fetch('http://18.225.57.61:7865/rewrite_pdf', {
          method: 'POST',
          body: rewriteFormData,
        });

        if (rewriteResponse.ok) {
          const jsonResponse = await rewriteResponse.json();
          const rewrittenTextFromApi = jsonResponse.rewritten_pdf;
          setRewrittenText(rewrittenTextFromApi);

          const uploadId = uuidv4();
          const storageRef = ref(storage, `uploads/${uploadId}/${selectedFiles[0].name}/${selectedButton}`);
          const uploadResult = await uploadBytes(storageRef, selectedFiles[0]);
          const downloadUrl = await getDownloadURL(uploadResult.ref);

          const docRef = doc(db, `uploads/${uploadId}`);
          await setDoc(docRef, {
            email: user.email,
            summaryType: selectedButton,
            uploadedAt: new Date(),
            rewrittenText: rewrittenTextFromApi,
            filePath: uploadResult.ref.fullPath,
            fileName: selectedFiles[0].name,
          });

          console.log('Data successfully saved to Firestore');
        } else {
          console.error('Error from rewrite_pdf API');
        }
      } else {
        console.error('Error from merge_pdfs API');
      }
    } catch (error) {
      console.error('Error occurred while sending request:', error);
    } finally {
      setUploading(false);
      setLoadingDiv(false);
    }
  };

  const formatTextWithBold = (text) => {
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/###\s*(\w+\s+\w+)/g, '<strong>$1</strong>');
    let formattedTextWithLineBreaks = formattedText.replace(/\n/g, '<br>');
    formattedTextWithLineBreaks = formattedTextWithLineBreaks.replace(/---/g, '');
    return { __html: formattedTextWithLineBreaks };
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 shadow-lg rounded-md sm:pt-[18vh]">
      {loadingDiv && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-md text-center">
            <Spin size="large" />
            <p className="mt-4">Processing file(s)...</p>
          </div>
        </div>
      )}

      <div className="flex-grow overflow-y-auto p-6 pb-[30vh]">
        <p className="font-semibold text-center text-xl mb-4">Input a Patient Summary</p>
        <p className="text-center mb-4">
          Include age, sex, relevant past medical history, medications, presenting symptoms, associated symptoms, etc.
        </p>

        {selectedFiles.map((file, index) => (
          <div
            key={index}
            className="flex items-center justify-between border border-gray-300 bg-gray-100 p-3 rounded-md mb-4"
          >
            <span className="text-gray-800 font-semibold">{file.name}</span>
            <FaTimes className="text-gray-500 cursor-pointer" onClick={() => handleRemoveFile(index)} />
          </div>
        ))}

        {rewrittenText && (
          <div className="mt-4 relative">
            <p className="font-semibold mb-2">Rewritten Summary:</p>
            <div
              className="border border-gray-300 p-4 bg-white rounded-md mb-4"
              style={{ height: '500px', overflowY: 'auto' }}
              ref={rewrittenTextRef}
            >
              <div dangerouslySetInnerHTML={formatTextWithBold(rewrittenText)} />
            </div>
          </div>
        )}
      </div>

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
                  multiple
                />
              </label>
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Type a message or upload files"
                className="flex-grow p-2 outline-none h-full"
              />
            </div>
            <button
              onClick={handleSendClick}
              className="bg-[#015BA3] text-white font-semibold px-4 py-2 rounded-md h-full"
              disabled={selectedFiles.length === 0 || uploading}
            >
              {uploading ? 'Uploading...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
