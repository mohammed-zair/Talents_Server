import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  AccumulationChartComponent,
  AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective,
  AccumulationLegend,
  PieSeries,
  AccumulationDataLabel,
  Inject as ChartInject,
  AccumulationTooltip,
} from '@syncfusion/ej2-react-charts';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';

const AdminPromotionModal = ({
  isOpen,
  onClose,
  user,
  onPromote,
  onSetPassword,
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    second_password: '',
    confirm_password: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  const handlePromote = useCallback(async () => {
    if (!user || !user.id) {
      console.error('No user ID provided for promotion');
      return;
    }

    setLoading(true);
    try {
      const result = await onPromote(user.id);
      if (result?.success && result?.requiresSecondPasswordSetup) {
        setStep(2);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Promotion failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user, onPromote, onClose]);

  const handleSetPassword = useCallback(async () => {
    const errors = {};
    
    if (!passwordData.second_password || passwordData.second_password.length < 8) {
      errors.second_password = 'Password must be at least 8 characters long';
    }
    
    if (passwordData.second_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(passwordData.second_password)) {
      errors.second_password = 'Password must contain uppercase, lowercase, number, and special character';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    if (!user || !user.id) {
      console.error('No user ID provided for password setup');
      return;
    }

    setLoading(true);
    try {
      const result = await onSetPassword(user.id, passwordData.second_password);
      if (result?.success) {
        onClose();
        setStep(1);
        setPasswordData({ second_password: '', confirm_password: '' });
        setPasswordErrors({});
      }
    } catch (err) {
      console.error('Password setup failed:', err);
    } finally {
      setLoading(false);
    }
  }, [passwordData, user, onSetPassword, onClose]);

  const handleClose = useCallback(() => {
    setStep(1);
    setPasswordData({ second_password: '', confirm_password: '' });
    setPasswordErrors({});
    onClose();
  }, [onClose]);

  const handleBack = useCallback(() => {
    setStep(1);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
        {step === 1 && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Promote to Admin
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to promote <strong>{user?.name || 'this user'}</strong> to admin?
            </p>
            <p className="text-sm text-yellow-600 mb-4">
              This will give them full administrative access to the system.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePromote}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                disabled={loading}
              >
                {loading ? 'Promoting...' : 'Promote to Admin'}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Set Admin Security Password
            </h3>
            <p className="text-gray-600 mb-4">
              Set a second password for <strong>{user?.name || 'this user'}</strong>&apos;s admin account.
            </p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Second Password
                </label>
                <input
                  type="password"
                  value={passwordData.second_password}
                  onChange={(e) => {
                    setPasswordData(prev => ({ ...prev, second_password: e.target.value }));
                    if (passwordErrors.second_password) {
                      setPasswordErrors(prev => ({ ...prev, second_password: '' }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Enter second password"
                />
                {passwordErrors.second_password && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.second_password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => {
                    setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }));
                    if (passwordErrors.confirm_password) {
                      setPasswordErrors(prev => ({ ...prev, confirm_password: '' }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Confirm second password"
                />
                {passwordErrors.confirm_password && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.confirm_password}</p>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-500 mb-4">
              <p>Password must contain:</p>
              <ul className="list-disc list-inside">
                <li>At least 8 characters</li>
                <li>Uppercase and lowercase letters</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSetPassword}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                disabled={loading}
              >
                {loading ? 'Setting Password...' : 'Set Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Customers = () => {
  const [gridInstance, setGridInstance] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminModal, setAdminModal] = useState({
    isOpen: false,
    user: null,
  });
  const [categories, setCategories] = useState([]);
  const [assigningUserId, setAssigningUserId] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const selectionsettings = { persistSelection: true };
  const toolbarOptions = ['Delete', 'Block', 'Unblock', 'Make Admin', 'Refresh'];
  const editing = { allowDeleting: true, allowEditing: true };

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get('/admin/users');
      const rawUsers = (Array.isArray(response.data?.data) && response.data.data)
        || (Array.isArray(response.data) && response.data)
        || [];
      const mappedUsers = rawUsers.map((user) => ({
        id: user.id ?? user.user_id ?? user.userId,
        name: user.name ?? user.username ?? user.full_name ?? user.email ?? '',
        full_name: user.full_name ?? user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        country: user.country ?? '',
        role: user.role ?? user.user_type ?? 'user',
        is_banned:
          typeof user.is_banned === 'boolean'
            ? user.is_banned
            : user.is_active === false,
        category: user.category ?? null,
        category_details: user.category_details ?? null,
        agent_code: user.agent_code ?? null,
        date_joined: user.date_joined ?? user.created_at ?? user.createdAt ?? null,
        last_login: user.last_login ?? null,
      }));
      setCustomers(mappedUsers);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers data. Please check if the admin user is logged in.');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategories([]);
    setCategoriesLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchCategories();
  }, [fetchCustomers, fetchCategories]);

  const assignCategory = useCallback(async (_userId, _categoryId) => {
    alert('Category assignment is not available on the current backend.');
  }, []);

  const promoteToAdmin = useCallback(async (userId) => {
    if (!userId) return { success: false };

    try {
      await axiosInstance.put(`/admin/users/${userId}`, { user_type: 'admin' });
      await fetchCustomers();
      return {
        success: true,
        requiresSecondPasswordSetup: false,
      };
    } catch (err) {
      console.error('Error promoting user to admin:', err);
      const errorMsg = err?.response?.data?.error || 'Failed to promote user to admin';
      alert(`Error: ${errorMsg}`);
      return { success: false };
    }
  }, [fetchCustomers]);

  const setAdminSecondPassword = useCallback(async (_userId, _password) => {
    alert('Setting a secondary admin password is not supported by this backend.');
    return { success: false };
  }, []);

  const openAdminPromotionModal = useCallback((user) => {
    setAdminModal({
      isOpen: true,
      user,
    });
  }, []);

  const closeAdminPromotionModal = useCallback(() => {
    setAdminModal({
      isOpen: false,
      user: null,
    });
  }, []);

  const getRoleClass = useCallback((role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'agent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  }, []);

  const getCategoryColor = useCallback((profitPercentage) => {
    if (!profitPercentage) return 'bg-gray-100 text-gray-800';
    
    if (profitPercentage >= 20) return 'bg-red-100 text-red-800';
    if (profitPercentage >= 10) return 'bg-orange-100 text-orange-800';
    if (profitPercentage >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  }, []);

  const safeCustomers = useMemo(
    () => (Array.isArray(customers) ? customers : []),
    [customers]
  );
  const safeCategories = useMemo(
    () => (Array.isArray(categories) ? categories : []),
    [categories]
  );

  const userActivityData = useMemo(() => {
    const totalUsers = safeCustomers.length;
    
    if (totalUsers === 0) {
      return [
        {
          x: 'Active',
          y: 0,
          text: '0',
          color: '#10B981',
          description: 'Logged in within the last 30 days',
        },
        {
          x: 'Dormant',
          y: 0,
          text: '0',
          color: '#EF4444',
          description: 'Has not logged in for 30+ days',
        },
        {
          x: 'New (Last 7 Days)',
          y: 0,
          text: '0',
          color: '#F59E0B',
          description: 'Registered within the last 7 days',
        },
      ];
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const active = safeCustomers.filter((user) => {
      const lastActive = user.last_login 
        ? new Date(user.last_login) 
        : user.date_joined 
          ? new Date(user.date_joined) 
          : null;
      return lastActive && lastActive > thirtyDaysAgo;
    }).length;

    const newUsers = safeCustomers.filter((user) => {
      const joinedDate = user.date_joined ? new Date(user.date_joined) : null;
      return joinedDate && joinedDate > sevenDaysAgo;
    }).length;

    const dormant = totalUsers - active;

    return [
      {
        x: 'Active',
        y: active,
        text: `${active}`,
        color: '#10B981',
        description: 'Logged in within the last 30 days',
      },
      {
        x: 'Dormant',
        y: dormant,
        text: `${dormant}`,
        color: '#EF4444',
        description: 'Has not logged in for 30+ days',
      },
      {
        x: 'New (Last 7 Days)',
        y: newUsers,
        text: `${newUsers}`,
        color: '#F59E0B',
        description: 'Registered within the last 7 days',
      },
    ];
  }, [safeCustomers]);

  const totalUsers = safeCustomers.length;
  const activePercentage = totalUsers > 0 ? ((userActivityData[0].y / totalUsers) * 100).toFixed(1) : '0.0';
  const dormantPercentage = totalUsers > 0 ? ((userActivityData[1].y / totalUsers) * 100).toFixed(1) : '0.0';
  const newPercentage = totalUsers > 0 ? ((userActivityData[2].y / totalUsers) * 100).toFixed(1) : '0.0';

  const adminCount = useMemo(
    () => safeCustomers.filter((user) => user?.role === 'admin').length,
    [safeCustomers]
  );

  const categorizedUsers = useMemo(
    () => safeCustomers.filter((user) => user.category || user.category_details).length,
    [safeCustomers]
  );

  const customersGrid = [
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
      field: 'category_details.display_name',
      headerText: 'Category',
      width: '140',
      textAlign: 'Center',
      template: (props) => {
        const category = props.category_details || props.category;
        const profitPercentage = category?.profit_percentage || 0;
        const displayName = category?.display_name || category?.name || 'Uncategorized';
        
        return (
          <div className="flex justify-center">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(profitPercentage)}`}>
              {displayName}
              {profitPercentage > 0 && ` (${profitPercentage}%)`}
            </span>
          </div>
        );
      },
    },
    {
      field: 'category_details.profit_percentage',
      headerText: 'Profit %',
      width: '100',
      textAlign: 'Center',
      template: (props) => {
        const profitPercentage = props.category_details?.profit_percentage || props.category?.profit_percentage || 0;
        return (
          <div className="text-center">
            <span className="font-semibold text-gray-700">
              {profitPercentage > 0 ? `${profitPercentage}%` : '0%'}
            </span>
          </div>
        );
      },
    },
    {
      field: 'category_edit',
      headerText: 'Edit Category',
      width: '180',
      textAlign: 'Center',
      template: (props) => (
        <div className="flex justify-center">
          <select
            value={props.category_details?.id || props.category?.id || ''}
            onChange={async (e) => {
              const val = e.target.value;
              await assignCategory(props.id, val);
            }}
            className="p-1 border rounded text-sm w-full max-w-[160px]"
            disabled={assigningUserId === props.id || categoriesLoading}
          >
            <option value="">Uncategorized</option>
            {categoriesLoading ? (
              <option disabled>Loading categories...</option>
            ) : (
              safeCategories
                .filter((c) => c.is_active)
                .sort((a, b) => a.order - b.order)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name || c.name} ({c.profit_percentage}%)
                  </option>
                ))
            )}
          </select>
        </div>
      ),
    },
    {
      field: 'role',
      headerText: 'Role',
      width: '100',
      template: (props) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleClass(props.role)}`}>
          {props.role || 'user'}
        </span>
      ),
    },
    {
      field: 'is_banned',
      headerText: 'Status',
      width: '100',
      template: (props) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          props.is_banned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}
        >
          {props.is_banned ? 'Banned' : 'Active'}
        </span>
      ),
    },
    {
      field: 'agent_code',
      headerText: 'Agent Code',
      width: '120',
      template: (props) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          props.agent_code ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
        }`}
        >
          {props.agent_code || 'N/A'}
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

  const toolbarClick = useCallback(async (args) => {
    if (!gridInstance) return;

    const selected = gridInstance.getSelectedRecords();
    const safeSelected = Array.isArray(selected) ? selected : [];

    if (args.item.id.includes('deletegrid')) {
      if (safeSelected.length > 0) {
        if (window.confirm(`Are you sure you want to delete ${safeSelected.length} customer(s)?`)) {
          alert(`${safeSelected.length} customer(s) marked for deletion.`);
        }
      } else {
        alert('Please select a customer to delete.');
      }
    }

    if (args.item.id.includes('Block')) {
      if (safeSelected.length > 0) {
        try {
          const banPromises = safeSelected.map((customer) => 
            axiosInstance.put(`/admin/users/${customer.id}`, { is_active: false })
          );
          await Promise.all(banPromises);
          await fetchCustomers();
          alert(`${safeSelected.length} customer(s) blocked successfully.`);
        } catch (err) {
          console.error('Error blocking customers:', err);
          alert('Error blocking customers');
        }
      } else {
        alert('Please select a customer to block.');
      }
    }

    if (args.item.id.includes('Unblock')) {
      if (safeSelected.length > 0) {
        try {
          const unbanPromises = safeSelected.map((customer) => 
            axiosInstance.put(`/admin/users/${customer.id}`, { is_active: true })
          );
          await Promise.all(unbanPromises);
          await fetchCustomers();
          alert(`${safeSelected.length} customer(s) unblocked successfully.`);
        } catch (err) {
          console.error('Error unblocking customers:', err);
          alert('Error unblocking customers');
        }
      } else {
        alert('Please select a customer to unblock.');
      }
    }

    if (args.item.id.includes('Make Admin')) {
      if (safeSelected.length > 0) {
        if (safeSelected.length > 1) {
          alert('Please select only one user to make admin.');
          return;
        }

        const user = safeSelected[0];
        if (!user) return;

        if (user.role === 'admin') {
          alert(`${user.name} is already an admin.`);
          return;
        }

        openAdminPromotionModal(user);
      } else {
        alert('Please select a user to make admin.');
      }
    }

    if (args.item.id.includes('Refresh')) {
      fetchCustomers();
    }
  }, [gridInstance, fetchCustomers, openAdminPromotionModal]);

  const pointRender = useCallback((args) => {
    const activityItem = userActivityData.find((item) => item.x === args.point.x);
    if (activityItem) {
      args.fill = activityItem.color;
    }
  }, [userActivityData]);

  if (loading) {
    return (
      <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
        <Header category="User Management" title="Customers" />
        <div className="flex justify-center items-center h-40">
          <div className="text-lg">Loading customers data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
        <Header category="User Management" title="Customers" />
        <div className="flex flex-col justify-center items-center h-40 gap-4">
          <div className="text-lg text-red-500">{error}</div>
          <button
            type="button"
            onClick={fetchCustomers}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
      <Header category="User Management" title="Customers" />

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Total: {totalUsers} users • Categorized: {categorizedUsers} ({totalUsers > 0 ? ((categorizedUsers / totalUsers) * 100).toFixed(1) : 0}%)
          </span>
        </div>
        <button
          type="button"
          onClick={fetchCustomers}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center gap-2"
        >
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-semibold">Total Customers</p>
          <p className="text-2xl font-bold text-blue-600">{totalUsers}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-semibold">Active Now</p>
          <p className="text-2xl font-bold text-green-600">{userActivityData[0].y}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Admin Users</p>
          <p className="text-2xl font-bold text-red-600">{adminCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            User Activity Status
          </h3>
          <p className="text-sm text-gray-600 text-center mb-4">
            Total Registered Users: {totalUsers}
          </p>
          {totalUsers > 0 ? (
            <AccumulationChartComponent
              id="user-activity-chart"
              legendSettings={{
                visible: true,
                position: 'Bottom',
                textStyle: { size: '12px', fontWeight: '600' },
              }}
              height="300px"
              tooltip={{
                enable: true,
                format: '${point.x} : <b>${point.y} users</b><br>${point.percentage}%',
              }}
              pointRender={pointRender}
            >
              <ChartInject services={[AccumulationLegend, PieSeries, AccumulationDataLabel, AccumulationTooltip]} />
              <AccumulationSeriesCollectionDirective>
                <AccumulationSeriesDirective
                  name="User Activity"
                  dataSource={userActivityData}
                  xName="x"
                  yName="y"
                  innerRadius="60%"
                  startAngle={0}
                  endAngle={360}
                  radius="70%"
                  dataLabel={{
                    visible: true,
                    name: 'text',
                    position: 'Inside',
                    font: {
                      fontWeight: '600',
                      color: '#fff',
                    },
                  }}
                />
              </AccumulationSeriesCollectionDirective>
            </AccumulationChartComponent>
          ) : (
            <div className="flex justify-center items-center h-40">
              <p className="text-gray-500">No data available for chart</p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Activity Insights</h3>

          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-800">Active Users</h4>
                <p className="text-2xl font-bold text-green-600">{userActivityData[0].y} users</p>
                <p className="text-sm text-green-600">{activePercentage}% of total</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <p className="text-xs text-green-700 mt-2">
              {userActivityData[0].description}
            </p>
          </div>

          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-red-800">Dormant Users</h4>
                <p className="text-2xl font-bold text-red-600">{userActivityData[1].y} users</p>
                <p className="text-sm text-red-600">{dormantPercentage}% of total</p>
              </div>
              <div className="w-3 h-3 bg-red-500 rounded-full" />
            </div>
            <p className="text-xs text-red-700 mt-2">
              {userActivityData[1].description}
            </p>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-yellow-800">New Users (7 Days)</h4>
                <p className="text-2xl font-bold text-yellow-600">{userActivityData[2].y} users</p>
                <p className="text-sm text-yellow-600">{newPercentage}% of total</p>
              </div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            </div>
            <p className="text-xs text-yellow-700 mt-2">
              {userActivityData[2].description}
            </p>
          </div>
        </div>
      </div>

      {safeCustomers.length > 0 ? (
        <GridComponent
          dataSource={safeCustomers}
          ref={(g) => setGridInstance(g)}
          enableHover={false}
          allowPaging
          pageSettings={{ pageCount: 5, pageSize: 10 }}
          selectionSettings={selectionsettings}
          toolbar={toolbarOptions}
          editSettings={editing}
          allowSorting
          allowFiltering
          toolbarClick={toolbarClick}
        >
          <ColumnsDirective>
            {customersGrid.map((item, index) => (
              <ColumnDirective key={`col-${index}`} {...item} />
            ))}
          </ColumnsDirective>
          <Inject services={[Page, Selection, Toolbar, Edit, Sort, Filter]} />
        </GridComponent>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No customers found</p>
          <p className="text-gray-400 mt-2">Customer data will appear here once available</p>
        </div>
      )}

      <AdminPromotionModal
        isOpen={adminModal.isOpen}
        onClose={closeAdminPromotionModal}
        user={adminModal.user}
        onPromote={promoteToAdmin}
        onSetPassword={setAdminSecondPassword}
      />
    </div>
  );
};

export default Customers;
