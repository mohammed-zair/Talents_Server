import React from 'react';
import { FiBriefcase, FiFileText, FiLayers, FiUser, FiUsers } from 'react-icons/fi';
import { RiBuildingLine, RiUserReceivedLine } from 'react-icons/ri';

export const earningData = [
  {
    title: 'Users',
    amount: '0',
    icon: <FiUser />,
    iconColor: '#1D4ED8',
    iconBg: '#DBEAFE',
    description: 'Total registered users',
  },
  {
    title: 'Companies',
    amount: '0',
    icon: <RiBuildingLine />,
    iconColor: '#047857',
    iconBg: '#D1FAE5',
    description: 'Approved companies',
  },
  {
    title: 'Company Requests',
    amount: '0',
    icon: <RiUserReceivedLine />,
    iconColor: '#B45309',
    iconBg: '#FEF3C7',
    description: 'Pending company approvals',
  },
  {
    title: 'Applications',
    amount: '0',
    icon: <FiBriefcase />,
    iconColor: '#7C3AED',
    iconBg: '#EDE9FE',
    description: 'Submitted applications',
  },
  {
    title: 'Job Postings',
    amount: '0',
    icon: <FiLayers />,
    iconColor: '#0E7490',
    iconBg: '#CFFAFE',
    description: 'Active job postings',
  },
  {
    title: 'CV Requests',
    amount: '0',
    icon: <FiFileText />,
    iconColor: '#B91C1C',
    iconBg: '#FEE2E2',
    description: 'Company CV purchase requests',
  },
  {
    title: 'CV Library',
    amount: '0',
    icon: <FiUsers />,
    iconColor: '#4B5563',
    iconBg: '#E5E7EB',
    description: 'Stored CVs',
  },
];
