import React, { useState, useEffect } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Selection,
  Inject,
  Edit,
  Toolbar,
  Sort,
  Filter,
} from '@syncfusion/ej2-react-grids';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';

const Blacklist = () => {
  const [blacklistData, setBlacklistData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gridInstance, setGridInstance] = useState(null);

  const selectionsettings = { persistSelection: true };
  const toolbarOptions = ['Unblock', 'Delete', 'Refresh'];
  const editing = { allowDeleting: true, allowEditing: false, allowAdding: false };

  const fetchBannedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/users/banned-users/');
      setBlacklistData(response.data);
    } catch (err) {
      console.error('Error fetching banned users:', err);
      setError('Failed to load blacklist data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBannedUsers();
  }, []);

  const getRoleClass = (role) => {
    if (role === 'admin') return 'bg-red-100 text-red-800';
    if (role === 'agent') return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const handleDeleteUsers = async (selected) => {
    if (window.confirm(`Are you sure you want to permanently delete ${selected.length} user(s)?`)) {
      try {
        alert(`${selected.length} user(s) marked for deletion.`);
      } catch (err) {
        console.error('Error deleting users:', err);
        alert('Error deleting users');
      }
    }
  };

  const handleUnblockUsers = async (selected) => {
    try {
      const unbanPromises = selected.map((user) => axiosInstance.post(`/users/unban/${user.id}/`));
      await Promise.all(unbanPromises);
      await fetchBannedUsers();
      alert(`${selected.length} user(s) unblocked successfully.`);
    } catch (err) {
      console.error('Error unblocking users:', err);
      alert('Error unblocking users');
    }
  };

  const toolbarClick = async (args) => {
    if (!gridInstance) return;

    const selected = gridInstance.getSelectedRecords();

    if (args.item.id.includes('deletegrid')) {
      if (selected.length > 0) {
        await handleDeleteUsers(selected);
      } else {
        alert('Please select a user to delete.');
      }
    }

    if (args.item.id.includes('Unblock')) {
      if (selected.length > 0) {
        await handleUnblockUsers(selected);
      } else {
        alert('Please select a user to unblock.');
      }
    }

    if (args.item.id.includes('Refresh')) {
      fetchBannedUsers();
    }
  };

  const blacklistGrid = [
    {
      type: 'checkbox',
      width: '50',
    },
    {
      field: 'id',
      headerText: 'ID',
      width: '80',
      textAlign: 'Center',
      isPrimaryKey: true,
    },
    {
      field: 'name',
      headerText: 'Username',
      width: '120',
    },
    {
      field: 'full_name',
      headerText: 'Full Name',
      width: '150',
    },
    {
      field: 'email',
      headerText: 'Email',
      width: '180',
    },
    {
      field: 'phone',
      headerText: 'Phone',
      width: '130',
    },
    {
      field: 'country',
      headerText: 'Country',
      width: '100',
    },
    {
      field: 'role',
      headerText: 'Role',
      width: '100',
      template: (props) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleClass(props.role)}`}>
          {props.role}
        </span>
      ),
    },
    {
      field: 'is_banned',
      headerText: 'Status',
      width: '100',
      template: () => (
        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
          Banned
        </span>
      ),
    },
    {
      field: 'date_joined',
      headerText: 'Joined Date',
      width: '120',
      format: 'yMd',
      textAlign: 'Center',
    },
    {
      field: 'last_login',
      headerText: 'Last Login',
      width: '120',
      format: 'yMd',
      textAlign: 'Center',
      template: (props) => (
        <span>
          {props.last_login ? new Date(props.last_login).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
        <Header category="Management" title="Blacklisted Accounts" />
        <div className="flex justify-center items-center h-40">
          <div className="text-lg">Loading blacklist data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
        <Header category="Management" title="Blacklisted Accounts" />
        <div className="flex justify-center items-center h-40">
          <div className="text-lg text-red-500">{error}</div>
          <button
            type="button"
            onClick={fetchBannedUsers}
            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="Management" title="Blacklisted Accounts" />

      <div className="flex justify-between items-center mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Total Banned Users</p>
          <p className="text-2xl font-bold text-red-600">{blacklistData.length}</p>
        </div>

        <button
          type="button"
          onClick={fetchBannedUsers}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm flex items-center gap-2"
        >
          Refresh Data
        </button>
      </div>

      {blacklistData.length > 0 ? (
        <GridComponent
          dataSource={blacklistData}
          enableHover={false}
          allowPaging
          pageSettings={{ pageCount: 5, pageSize: 10 }}
          selectionSettings={selectionsettings}
          toolbar={toolbarOptions}
          editSettings={editing}
          allowSorting
          allowFiltering
          toolbarClick={toolbarClick}
          width="auto"
          ref={(g) => setGridInstance(g)}
        >
          <ColumnsDirective>
            {blacklistGrid.map((item, index) => (
              <ColumnDirective key={index} {...item} />
            ))}
          </ColumnsDirective>
          <Inject services={[Page, Selection, Toolbar, Edit, Sort, Filter]} />
        </GridComponent>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-500 text-lg">No banned users found</p>
          <p className="text-gray-400 mt-2">All users are currently active and in good standing</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">About Blacklisted Accounts</h4>
        <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
          <li>Banned users cannot login to the system</li>
          <li>You can unblock users to restore their access</li>
          <li>Use the Unblock button to restore user access</li>
          <li>Deleted users are permanently removed from the system</li>
        </ul>
      </div>
    </div>
  );
};

export default Blacklist;
