import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import { useLocalContext } from '../context/context';
import { collection, query, where, getDocs } from 'firebase/firestore'; // Firestore functions
import db from '../lib/firebase';

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
      className="fixed top-[5rem] bottom-0 w-[90vw] md:w-[20vw] lg:w-[16vw] h-[80vh] md:h-[86.8vh] flex flex-col items-center py-6 border-r bg-white text-black shadow-lg overflow-y-auto"
    >
      {/* Title */}
      <h2 className="text-xl font-bold mb-6 text-[#015BA3]">Query Manager</h2>

      {/* New Query Button */}
      <Link to="/" className="bg-[#015BA3] text-center text-white font-semibold px-4 py-3 rounded-md w-[90%] hover:bg-[#00457f] focus:ring focus:ring-[#015BA3] mb-8">
        New Query +
      </Link>

      {/* Sidebar Content */}
      <div className="flex flex-col items-start w-full px-4 space-y-4">
        {uploads.length > 0 ? (
          uploads.map((upload) => (
            <Link
              key={upload.id}
              to={`/uploads/${upload.id}`} // Route to the UUID (id of the upload)
              className="w-full"
            >
              <button className="w-full p-4 text-left bg-gray-100 border-b-2 border-gray-300 shadow-sm hover:bg-gray-200 transition-colors duration-200">
                {/* Display the file name without .pdf */}
                <p className="text-sm font-medium">{upload.fileName.replace(/\.pdf$/i, '')}</p>
              </button>
            </Link>
          ))
        ) : (
          <p className="text-gray-500">No uploads found</p>
        )}
      </div>
    </motion.div>
  );
};

export default Sidebar;
