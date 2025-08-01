import uuid from 'uuid';
import {
  PaneHeader,
  Button,
  MultiColumnListCell,
  TextField,
  MultiSelect,
  EditableListRow,
  Modal,
  MultiSelectOption,
  ValueChipRoot,
  HTML,
  including,
  Callout,
} from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import { getTestEntityValue } from '../../../utils/stringTools';
import SettingsPane, {
  startRowIndex,
  rootPane,
  addButton,
  table as tableWithOwners,
} from '../settingsPane';

const defaultServicePoints = ['Circ Desk 1', 'Circ Desk 2', 'Online'];
const associatedServicePoint = MultiSelect({ ariaLabelledby: 'associated-service-point-label' });

const fillOwner = ({ name, description, servicePoint }, rowIndex = 2) => {
  const index = rowIndex - startRowIndex;
  cy.wait(500);
  cy.do(tableWithOwners.find(TextField({ name: `items[${index}].owner` })).fillIn(name));
  cy.wait(500);
  if (description) {
    cy.do(tableWithOwners.find(TextField({ name: `items[${index}].desc` })).fillIn(description));
  }
  cy.wait(500);
  if (servicePoint) {
    cy.do(associatedServicePoint.select(servicePoint));
  }
  cy.wait(500);
};

function getAddServicePointsToOwnerPayload(owner, servicePoints) {
  const points = servicePoints.map((servicePoint) => {
    return { value: servicePoint.id, label: `${servicePoint.name}` };
  });
  return { owner: owner.name, servicePointOwner: points, id: owner.id };
}

export default {
  trySave() {
    SettingsPane.clickSaveBtn();
  },
  waitLoading() {
    cy.intercept({
      method: 'GET',
      url: '/service-points??*',
    }).as('getServicePoints');
    cy.wait('@getServicePoints', getLongDelay());
    cy.expect(PaneHeader('Fee/fine: Owners').exists());
    cy.expect(addButton.exists());
    cy.expect(rootPane.find(HTML({ className: including('spinner') })).absent());
    // TODO: clarify the reason of extra waiting
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);
  },
  getDefaultNewOwner({ id = uuid(), name = 'owner', desc } = {}) {
    return {
      id,
      owner: getTestEntityValue(name),
      desc: getTestEntityValue(desc),
    };
  },
  startNewLineAdding: () => SettingsPane.clickAddNewBtn(),
  defaultServicePoints,
  getUsedServicePoints() {
    cy.then(() => tableWithOwners.isPresented()).then((isPresented) => {
      if (isPresented) {
        cy.then(() => tableWithOwners.rowCount()).then((rowsCount) => {
          const usedServicePoints = [];
          for (let i = 0; i < rowsCount; i++) {
            cy.then(() => tableWithOwners
              .find(EditableListRow({ index: i }))
            // read value from thrid column(2 in case of 0 in initial position)
              .find(MultiColumnListCell({ columnIndex: startRowIndex }))
              .liValues()).then((servicePointNames) => {
              usedServicePoints.push(servicePointNames);
              // flat related with cases when several service points assigned to one user
              cy.wrap(usedServicePoints.flat(1)).as('usedServicePoints');
            });
          }
        });
      } else {
        cy.wrap([]).as('usedServicePoints');
      }
    });
    return cy.get('@usedServicePoints');
  },
  fillOwner,
  saveOwner(name) {
    SettingsPane.clickSaveBtn();
    cy.expect(cy.expect(tableWithOwners.find(MultiColumnListCell(name)).exists()));
  },

  clickSaveBtn() {
    cy.do(Button('Save').click());
  },

  editOwner(owner, { name, description }) {
    cy.then(() => tableWithOwners.find(MultiColumnListCell(owner)).row()).then((rowIndex) => {
      SettingsPane.clickEditBtn({ rowIndex });
      fillOwner({ name, description }, rowIndex);
      SettingsPane.clickSaveBtn({ rowIndex });
    });
  },

  startEditOwner(owner, { name, description }) {
    cy.then(() => tableWithOwners.find(MultiColumnListCell(owner)).row()).then((rowIndex) => {
      SettingsPane.clickEditBtn({ rowIndex });
      fillOwner({ name, description }, rowIndex);
    });
  },

  deleteOwner(owner) {
    if (owner) {
      cy.then(() => tableWithOwners.find(MultiColumnListCell(owner)).row()).then((rowIndex) => {
        SettingsPane.clickDeleteBtn({ rowIndex });
      });
    } else {
      SettingsPane.clickDeleteBtn();
    }
    cy.do(Modal('Delete Fee/fine owner').find(Button('Delete')).click());
    cy.expect(Modal('Delete Fee/fine owner').absent());
  },
  checkUsedServicePoints(usedServicePoints) {
    cy.do(associatedServicePoint.open());
    usedServicePoints.forEach((userServicePoint) => cy.expect(MultiSelectOption(userServicePoint).absent()));
  },
  unselectExistingServicePoint(usedServicePoint) {
    cy.log(usedServicePoint);
    cy.wait(500);

    cy.then(() => tableWithOwners.rowCount()).then((rowsCount) => {
      const checkRow = (index) => {
        if (index >= rowsCount) return;

        cy.then(() => tableWithOwners
          .find(EditableListRow({ index }))
          .find(MultiColumnListCell({ columnIndex: startRowIndex }))
          .content()).then((servicePointNames) => {
          if (servicePointNames && servicePointNames.includes(usedServicePoint)) {
            const currentRow = tableWithOwners.find(EditableListRow({ index }));

            cy.do(currentRow.find(Button({ icon: 'edit' })).click());
            cy.wait(500);

            cy.expect(currentRow.find(ValueChipRoot(usedServicePoint)).exists());

            cy.do(
              currentRow
                .find(ValueChipRoot(usedServicePoint))
                .find(Button({ icon: 'times' }))
                .click(),
            );
            cy.wait(500);

            cy.do(currentRow.find(Button('Save')).click());
            cy.wait(500);

            cy.expect(currentRow.find(ValueChipRoot(usedServicePoint)).absent());
          } else {
            checkRow(index + 1);
          }
        });
      };

      checkRow(0);
    });
  },

  checkFreeServicePointPresence(freeServicePoint) {
    cy.do(associatedServicePoint.open());
    cy.expect(MultiSelectOption(freeServicePoint).exists());
  },
  multiCheckFreeServicePointPresence(servicePoints) {
    cy.do(associatedServicePoint.open());
    servicePoints.forEach((servicePoint) => {
      cy.expect(MultiSelectOption(servicePoint.name).exists());
    });
  },
  cancelAdding(rowIndex = 2) {
    SettingsPane.clickCancelBtn({ rowIndex });
  },
  createViaApi(owner) {
    return SettingsPane.createViaApi({ path: 'owners', body: owner });
  },
  getOwnerViaApi: (searchParams) => {
    cy.okapiRequest({
      path: 'owners',
      searchParams,
    }).then((owner) => {
      cy.wrap(owner.body.owners[0]).as('owner');
    });
    return cy.get('@owner');
  },
  deleteViaApi(ownerId) {
    return SettingsPane.deleteViaApi({ path: `owners/${ownerId}` });
  },
  checkValidatorError({ placeholder = 'owner', error }) {
    cy.expect(rootPane.find(TextField({ placeholder })).has({ error }));
  },
  addServicePointsViaApi(owner, servicePoints) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `owners/${owner.id}`,
      body: getAddServicePointsToOwnerPayload(owner, servicePoints),
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyMultiSelectAppearance() {
    cy.do(associatedServicePoint.open());
    cy.wait(500);
    cy.expect(HTML({ className: including('multiSelectMenu') }).exists());
    cy.do(associatedServicePoint.close());
  },

  selectServicePoint(servicePointName) {
    cy.do(MultiSelectOption(servicePointName).click());
  },

  selectMultipleServicePoints(servicePointName) {
    cy.do(associatedServicePoint.open());
    cy.do(
      HTML({ className: including('multiSelectMenu') })
        .find(MultiSelectOption(servicePointName))
        .click(),
    );
    cy.do(associatedServicePoint.close());
    cy.wait(1000);
    this.removeServicePoint();
    cy.wait(500);
  },

  removeServicePoint() {
    cy.do(Button({ icon: 'times' }).click());
  },

  verifySuccessfulCallout(type) {
    cy.expect(Callout(including(type)).exists());
  },

  verifyRemovedServicePoint(owner, servicePointName) {
    cy.then(() => tableWithOwners.find(MultiColumnListCell(owner)).row()).then((rowIndex) => {
      cy.expect(
        tableWithOwners
          .find(EditableListRow({ index: rowIndex }))
          .find(HTML({ text: including(servicePointName) }))
          .absent(),
      );
    });
  },
};
