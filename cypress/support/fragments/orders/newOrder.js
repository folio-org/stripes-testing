import uuid from 'uuid';

export default {
  defaultOneTimeOrder: {
    id: uuid(),
    vendor: '',
    orderType: 'One-time'
  }
};
