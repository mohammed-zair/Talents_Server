import React from 'react';
import { FiFileText, FiHome, FiLayers, FiList, FiUser } from 'react-icons/fi';
import { RiBuildingLine, RiUserReceivedLine } from 'react-icons/ri';
import { MdEmail, MdNotificationsActive } from 'react-icons/md';

export const links = [
  {
    title: 'Dashboard',
    links: [
      {
        name: 'home',
        label: 'Home',
        icon: <FiHome />,
      },
    ],
  },
  {
    title: 'Administration',
    links: [
      {
        name: 'users',
        label: 'Users',
        icon: <FiUser />,
      },
      {
        name: 'companies',
        label: 'Companies',
        icon: <RiBuildingLine />,
      },
      {
        name: 'company-requests',
        label: 'Company Requests',
        icon: <RiUserReceivedLine />,
      },
      {
        name: 'cv-requests',
        label: 'CV Requests',
        icon: <FiFileText />,
      },
      {
        name: 'applications',
        label: 'Applications',
        icon: <FiList />,
      },
      {
        name: 'job-postings',
        label: 'Job Postings',
        icon: <FiLayers />,
      },
      {
        name: 'cvs',
        label: 'CV Library',
        icon: <FiFileText />,
      },
      {
        name: 'email',
        label: 'Email Center',
        icon: <MdEmail />,
      },
      {
        name: 'push',
        label: 'Push Center',
        icon: <MdNotificationsActive />,
      },
    ],
  },
];
