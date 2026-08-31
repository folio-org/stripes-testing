import AcqVersionHistory from '../acqVersionHistory';

export default {
  assertVersionHistoryCard(params) {
    AcqVersionHistory.assertVersionHistoryCard('organization', params);
  },

  selectVersionHistoryCard({ eventDate, index }) {
    AcqVersionHistory.selectVersionHistoryCard('organization', { eventDate, index });
  },
};
