import { including, MultiColumnListCell, MultiColumnListRow } from '../../../../../../interactors';
import getRandomPostfix from '../../../../utils/stringTools';

const defaultStatisticalCodeType = {
  source: 'local',
  name: `autotest_statistical_code_type_${getRandomPostfix()}`,
};

export default {
  createViaApi(body = defaultStatisticalCodeType) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'statistical-code-types',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `statistical-code-types/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  verifyConsortiumStatisticalCodeTypesInTheList({ name, source = 'consortium', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name), isContainer: false });
    const actionsCell = MultiColumnListCell({ columnIndex: 3 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: source })).exists(),
    ]);
    if (actions.length === 0) {
      cy.expect(row.find(actionsCell).has({ content: '' }));
    }
  },

  verifyStatisticalCodeTypesAbsentInTheList({ name }) {
    cy.expect(MultiColumnListRow({ content: including(name) }).absent());
  },
};
