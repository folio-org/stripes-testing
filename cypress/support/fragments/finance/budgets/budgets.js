import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

export default {
  getDefaultBudget() {
    return {
      id: uuid(),
      name: `autotest_budget_${getRandomPostfix()}`,
      allocated: 50,
      allowableEncumbrance: 100,
      allowableExpenditure: 100,
      budgetStatus: 'Active',
    };
  },
  createViaApi(budgetProperties) {
    return cy
      .okapiRequest({
        path: 'finance/budgets',
        body: budgetProperties,
        method: 'POST',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
  deleteViaApi(budgetId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `finance/budgets/${budgetId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
