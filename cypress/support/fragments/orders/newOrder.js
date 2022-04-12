import uuid from 'uuid';

export default {
  defaultOrder: {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time'
  },
  specialOrder: {
    id: uuid(),
    poNumberPrefix: 'pref',
    poNumberSuffix: 'suf',
    reEncumber: true,
    manualPo: true,
    approved: true,
    orderType: 'One-Time',
    vendor: '',
  }
};
