import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import { useLocalContext } from '../context/context';
import { collection, query, where, getDocs } from 'firebase/firestore'; // Firestore functions
import db from '../lib/firebase';
import { FaFolderOpen } from 'react-icons/fa'; // Example icon for file uploads

const Sidebar = () => {
  const { user } = useLocalContext(); // Get the current user from context
  const [uploads, setUploads] = useState([]); // State to hold the uploads

  // Fetch uploads for the current user
  useEffect(() => {
    const fetchUploads = async () => {
      if (user) {
        try {
          // Query Firestore for documents in 'uploads' where the email matches the user's email
          const q = query(collection(db, 'uploads'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);

          // Map over the documents and extract the filenames and ids (uuid)
          const userUploads = querySnapshot.docs.map((doc) => ({
            id: doc.id, // uuid of the document
            ...doc.data(),
          }));

          setUploads(userUploads); // Store uploads in the state
        } catch (error) {
          console.error('Error fetching uploads:', error);
        }
      }
    };

    fetchUploads();
  }, [user]);

  return (
    <motion.div
      initial={{ x: '-100%' }} // Start off-screen
      animate={{ x: 0 }} // Slide in
      exit={{ x: '-100%' }} // Slide out
      transition={{ type: 'tween', duration: 0.3 }} // Smooth transition
      className="fixed top-[5rem] bottom-0 w-[80vw] md:w-[18vw] lg:w-[14vw] h-[80vh] md:h-[85vh] flex flex-col items-center py-4 border-r bg-gradient-to-b from-[#F1F1F1] to-[#FFFFFF] text-black shadow-lg overflow-y-auto rounded-l-3xl z-50 sm:z-30" // z-50 for mobile, z-30 for larger screens
    >
      {/* Title */}
      <h2 className="text-lg font-semibold mb-4 text-[#015BA3]">Query Manager</h2>

      {/* New Query Button */}
      <Link
        to="/"
        className="bg-[#015BA3] text-center text-white font-semibold px-4 py-2 rounded-md w-[90%] hover:bg-[#00457f] focus:ring focus:ring-[#015BA3] mb-6 transition duration-200 ease-in-out"
      >
        New Query +
      </Link>

      {/* Sidebar Content */}
      <div className="flex flex-col items-start w-full px-4 space-y-4">
        {uploads.length > 0 ? (
          uploads.map((upload) => (
            <div key={upload.id} className="w-full">
              {upload.fileUrls && upload.fileUrls[0] ? (
                <Link to={`/uploads/${upload.id}`} className="w-full">
                  <button className="w-full p-3 bg-white border-b-2 border-gray-200 shadow-sm hover:bg-gray-50 transition-colors duration-200 text-left font-medium rounded-md flex items-center">
                    <FaFolderOpen className="mr-3 text-[#015BA3] text-md" /> {/* Folder Icon */}
                    <div>
                      <p className="text-sm font-medium text-black">
                        {upload.fileUrls[0].fileName.replace(/\.pdf$/i, '')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(upload.uploadedAt.seconds * 1000).toLocaleString()}
                      </p>
                    </div>
                  </button>
                </Link>
              ) : (
                <p className="text-gray-500">No files available</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500">No uploads found</p>
        )}
      </div>
    </motion.div>
  );
};

export default Sidebar;
