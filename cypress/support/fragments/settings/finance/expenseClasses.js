import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

export default {
  getDefaultExpenseClass() {
    return {
      name: `autotest_class_name_${getRandomPostfix()}`,
      code: `autotest_class_code_${getRandomPostfix()}`,
      externalAccountNumberExt: '',
      id: uuid(),
    };
  },
  createExpenseClassViaApi(expenseClass) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'finance/expense-classes',
        body: expenseClass,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body;
      });
  },
  deleteExpenseClassViaApi(expenseClassId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `finance/expense-classes/${expenseClassId}`,
    });
  },
};
