import React, { useState, useEffect } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Inject,
  Toolbar,
  Sort,
  Filter,
  Selection,
} from '@syncfusion/ej2-react-grids';
import { Header } from '../../components';
import axiosInstance from '../../utils/axiosConfig';

const Agents = () => {
  const [agentsData, setAgentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [assigningUserId, setAssigningUserId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionRate, setCommissionRate] = useState('');
  const [updatingCommission, setUpdatingCommission] = useState(false);

  const toolbarOptions = ['Search', 'Refresh'];

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('/agents/agents/');
      setAgentsData(response.data);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError('Failed to load agents data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setCategories([]);
  };

  const assignCategory = async (_userId, _categoryId) => {
    alert('Category assignment is not available on the current backend.');
  };

  const formattedAgentsData = agentsData.map((agent) => ({
    id: agent.id,
    username: agent.username,
    full_name: agent.full_name,
    clients_count: agent.clients_count,
    balance: agent.balance,
    commission_rate: agent.commission_rate,
    products_count: agent.products_count,
    balance_formatted: `$${agent.balance?.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) || '0.00'}`,
    commission_rate_formatted: `${agent.commission_rate}%`,
    status: 'Active',
  }));

  const handleRowSelected = (args) => {
    setSelectedAgent(args.data);
  };

  const handleViewUsers = () => {
    if (selectedAgent) {
      window.location.href = `/agents-users/${selectedAgent.id}`;
    }
  };

  const handleUpdateCommission = () => {
    if (selectedAgent) {
      setCommissionRate(selectedAgent.commission_rate.toString());
      setShowCommissionModal(true);
    }
  };

  const handleSaveCommission = async () => {
    if (!selectedAgent || !commissionRate) return;

    try {
      setUpdatingCommission(true);
      await axiosInstance.post(`/agents/agent/${selectedAgent.id}/commission/`, {
        commission_rate: parseFloat(commissionRate),
      });

      await fetchAgents();
      setShowCommissionModal(false);
      setCommissionRate('');
      alert('Commission rate updated successfully!');
    } catch (err) {
      console.error('Error updating commission:', err);
      alert('Failed to update commission rate');
    } finally {
      setUpdatingCommission(false);
    }
  };

  const handleToolbarClick = (args) => {
    if (args.item.id.includes('Refresh')) {
      fetchAgents();
    }
  };

  const handleDemoteAgent = async () => {
    if (!selectedAgent) return;

    if (window.confirm(`Are you sure you want to demote ${selectedAgent.full_name} to regular user?`)) {
      try {
        await axiosInstance.post(`/agents/demote-to-user/${selectedAgent.id}/`);
        await fetchAgents();
        setSelectedAgent(null);
        alert('Agent demoted successfully!');
      } catch (err) {
        console.error('Error demoting agent:', err);
        alert('Failed to demote agent');
      }
    }
  };

  const handleModalClose = () => {
    setShowCommissionModal(false);
  };

  const calculateTotalBalance = () => { return agentsData.reduce((sum, agent) => sum + agent.balance, 0); };

  const calculateAverageCommission = () => {
    if (agentsData.length === 0) return 0;
    return agentsData.reduce((sum, agent) => sum + agent.commission_rate, 0) / agentsData.length;
  };

  const calculateTotalClients = () => {
    return agentsData.reduce((sum, agent) => sum + agent.clients_count, 0);
  };

  if (loading) {
    return (
      <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
        <Header category="Management" title="Agents" />
        <div className="flex justify-center items-center h-40">
          <div className="text-lg">Loading agents data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white rounded-3xl">
        <Header category="Management" title="Agents" />
        <div className="flex justify-center items-center h-40">
          <div className="text-lg text-red-500">{error}</div>
          <button
            type="button"
            onClick={fetchAgents}
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
      <Header category="Management" title="Agents" />

      {selectedAgent && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">Selected Agent: {selectedAgent.full_name}</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleViewUsers}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
              >
                View Users
              </button>
              <button
                type="button"
                onClick={handleUpdateCommission}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
              >
                Update Commission
              </button>
              <button
                type="button"
                onClick={handleDemoteAgent}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
              >
                Demote to User
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Current Commission</p>
              <p className="font-semibold">{selectedAgent.commission_rate_formatted}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Clients</p>
              <p className="font-semibold">{selectedAgent.clients_count}</p>
            </div>
            <div>
              <p className="text-gray-500">Assigned Products</p>
              <p className="font-semibold">{selectedAgent.products_count}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Balance</p>
              <p className="font-semibold">{selectedAgent.balance_formatted}</p>
            </div>
          </div>
        </div>
      )}

      <GridComponent
        dataSource={formattedAgentsData}
        allowPaging
        pageSettings={{ pageSize: 10 }}
        allowSorting
        allowFiltering
        toolbar={toolbarOptions}
        height={400}
        rowSelected={handleRowSelected}
        selectionSettings={{ type: 'Single' }}
        toolbarClick={handleToolbarClick}
      >
        <ColumnsDirective>
          <ColumnDirective
            field="id"
            headerText="ID"
            width="80"
            textAlign="Center"
          />
          <ColumnDirective
            field="username"
            headerText="Username"
            width="120"
            textAlign="Left"
          />
          <ColumnDirective
            field="full_name"
            headerText="Full Name"
            width="150"
            textAlign="Left"
          />
          <ColumnDirective
            field="category"
            headerText="Category"
            width="180"
            textAlign="Left"
            template={(props) => (
              <select
                value={(props.category && props.category.id) || ''}
                onChange={async (e) => {
                  const val = e.target.value;
                  await assignCategory(props.id, val);
                }}
                className="p-1 border rounded w-full text-sm"
                disabled={assigningUserId === props.id}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
                ))}
              </select>
            )}
          />
          <ColumnDirective
            field="clients_count"
            headerText="Clients"
            width="80"
            textAlign="Center"
          />
          <ColumnDirective
            field="balance_formatted"
            headerText="Balance"
            width="120"
            textAlign="Center"
          />
          <ColumnDirective
            field="commission_rate_formatted"
            headerText="Commission"
            width="100"
            textAlign="Center"
          />
          <ColumnDirective
            field="products_count"
            headerText="Products"
            width="80"
            textAlign="Center"
          />
          <ColumnDirective
            field="status"
            headerText="Status"
            width="100"
            textAlign="Center"
          />
        </ColumnsDirective>
        <Inject services={[Page, Toolbar, Sort, Filter, Selection]} />
      </GridComponent>

      {showCommissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">
              Update Commission for {selectedAgent?.full_name}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter commission rate"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                disabled={updatingCommission}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCommission}
                disabled={updatingCommission || !commissionRate}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:bg-gray-400"
              >
                {updatingCommission ? 'Updating...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-semibold">Total Agents</p>
          <p className="text-2xl font-bold text-blue-600">{agentsData.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-semibold">Total Clients</p>
          <p className="text-2xl font-bold text-green-600">
            {calculateTotalClients()}
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-purple-800 font-semibold">Total Balance</p>
          <p className="text-2xl font-bold text-purple-600">
            ${calculateTotalBalance().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-800 font-semibold">Avg Commission</p>
          <p className="text-2xl font-bold text-orange-600">
            {`${calculateAverageCommission().toFixed(1)}%`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Agents;
