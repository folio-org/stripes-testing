import {
  Button,
  including,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  Pane,
} from '../../../../../../interactors';
import getRandomPostfix from '../../../../utils/stringTools';

const rootPane = Pane('Statistical code types');
const actionIcons = ['edit', 'trash'];

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

  waitLoading() {
    ['Name', 'Source', 'Last updated', 'Actions'].forEach((header) => {
      cy.expect(rootPane.find(MultiColumnListHeader(header)).exists());
    });
  },

  verifyLocalStatisticalCodeTypesInTheList({
    name,
    source = 'local',
    lastUpdated = [],
    actions = [],
  }) {
    const row = MultiColumnListRow({ content: including(name), isContainer: false });
    const actionsCell = row.find(MultiColumnListCell({ columnIndex: 3 }));
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: source })).exists(),
    ]);
    lastUpdated.forEach((text) => {
      cy.expect(
        row.find(MultiColumnListCell({ columnIndex: 2, content: including(text) })).exists(),
      );
    });
    if (actions.length === 0) {
      cy.expect(actionsCell.has({ content: '' }));
    } else {
      actionIcons.forEach((action) => {
        const button = actionsCell.find(Button({ icon: action }));
        cy.expect(actions.includes(action) ? button.exists() : button.absent());
      });
    }
  },

  verifyStatisticalCodeTypesAbsentInTheList({ name }) {
    cy.expect(MultiColumnListRow({ content: including(name) }).absent());
  },
};
