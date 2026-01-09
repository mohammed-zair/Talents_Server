import React, { useState } from 'react';

const RequestReviewModal = ({ request, onClose }) => {
  const [decision, setDecision] = useState('');
  const [notes, setNotes] = useState('');

  const handleApprove = () => {
    if (!decision && !notes) {
      if (!window.confirm('Approve without adding notes?')) return;
    }

    console.log(`Approving request ${request.RequestID}`, { decision, notes });
    alert(`Request ${request.RequestID} Approved ✅\n\nDecision: ${decision || 'No notes added'}`);
    onClose();
  };

  const handleReject = () => {
    if (!decision) {
      alert('Please provide a reason for rejection');
      return;
    }

    console.log(`Rejecting request ${request.RequestID}`, { decision, notes });
    alert(`Request ${request.RequestID} Rejected ❌\n\nReason: ${decision}`);
    onClose();
  };

  const handleRequestInfo = () => {
    alert(`Full Request Details:\n\n${JSON.stringify(request, null, 2)}`);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white dark:bg-secondary-dark-bg p-6 rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Review Request {request.RequestID}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-3">
            <div>
              <strong>User Information:</strong>
              <div className="flex items-center gap-3 mt-1">
                <img
                  className="rounded-full w-10 h-10 object-cover"
                  src={request.UserImage}
                  alt={request.UserName}
                />
                <div>
                  <p>{request.UserName}</p>
                  <p className="text-sm text-gray-500">{request.UserEmail}</p>
                  <p className="text-sm text-gray-400">{request.UserPhone}</p>
                </div>
              </div>
            </div>
            <div>
              <strong>Request Type:</strong>
              <p className="mt-1">{request.RequestType}</p>
            </div>
            <div>
              <strong>Status:</strong>
              <p className="mt-1">{request.Status}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <strong>Submitted Date:</strong>
              <p className="mt-1">{request.SubmittedDate.toLocaleDateString()}</p>
            </div>
            <div>
              <strong>Priority:</strong>
              <p className="mt-1">{request.Priority}</p>
            </div>
            {request.Amount && (
              <div>
                <strong>Amount:</strong>
                <p className="mt-1 font-semibold">{request.Amount}</p>
              </div>
            )}
            {request.Details && (
              <div>
                <strong>Details:</strong>
                <p className="mt-1 text-sm">{request.Details}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Decision Notes / Reason
            :
          </label>
          <textarea
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            placeholder="Enter your decision notes or rejection reason..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (Optional)
            :
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional comments or instructions..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-16"
          />
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleRequestInfo}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
          >
            View Full Details
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReject}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Reject Request
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Approve Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestReviewModal;
