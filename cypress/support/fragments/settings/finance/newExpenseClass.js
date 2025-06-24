import getRandomPostfix from '../../../utils/stringTools';
import { REQUEST_METHOD } from '../../../constants';

export default {
  defaultUiBatchGroup: {
    name: `AT_Class_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNumber: getRandomPostfix(),
  },

  createViaApi: (expenseClass) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'finance/expense-classes',
        body: {
          name: expenseClass.name,
          code: expenseClass.code,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body.id);
  },
};
