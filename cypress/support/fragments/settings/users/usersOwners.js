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

const fillOwner = ({ name, description, servicePoint }, rowIndex = 2) => {
  const index = rowIndex - startRowIndex;

  cy.do(tableWithOwners.find(TextField({ name: `items[${index}].owner` })).fillIn(name));

  if (description) {
    cy.do(tableWithOwners.find(TextField({ name: `items[${index}].desc` })).fillIn(description));
  }

  if (servicePoint) {
    cy.do(
      tableWithOwners
        .find(MultiSelect({ ariaLabelledby: 'associated-service-point-label' }))
        .select(servicePoint),
    );
  }
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
  editOwner(owner, { name, description }) {
    cy.then(() => tableWithOwners.find(MultiColumnListCell(owner)).row()).then((rowIndex) => {
      SettingsPane.clickEditBtn({ rowIndex });
      fillOwner({ name, description }, rowIndex);
      SettingsPane.clickSaveBtn({ rowIndex });
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
    cy.do(
      tableWithOwners
        .find(MultiSelect({ ariaLabelledby: 'associated-service-point-label' }))
        .open(),
    );
    usedServicePoints.forEach((userServicePoint) => cy.expect(MultiSelectOption(userServicePoint).absent()));
  },
  unselectExistingServicePoint(usedServicePoint) {
    cy.then(() => tableWithOwners.find(MultiColumnListCell(usedServicePoint)).row()).then(
      (rowNumber) => {
        const currentRow = tableWithOwners.find(
          EditableListRow({ index: rowNumber - startRowIndex }),
        );
        // filter index implemented based on parent-child relations.
        // aria-rowindex calculated started from 2. Need to count it.
        cy.do(currentRow.find(Button({ icon: 'edit' })).click());
        cy.do(
          currentRow
            .find(ValueChipRoot(usedServicePoint))
            .find(Button({ icon: 'times' }))
            .click(),
        );
        cy.do(currentRow.find(Button('Save')).click());
      },
    );
  },
  checkFreeServicePointPresence(freeServicePoint) {
    cy.do(
      tableWithOwners
        .find(MultiSelect({ ariaLabelledby: 'associated-service-point-label' }))
        .open(),
    );
    cy.expect(MultiSelectOption(freeServicePoint).exists());
  },
  multiCheckFreeServicePointPresence(servicePoints) {
    cy.do(
      tableWithOwners
        .find(MultiSelect({ ariaLabelledby: 'associated-service-point-label' }))
        .open(),
    );
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
};
