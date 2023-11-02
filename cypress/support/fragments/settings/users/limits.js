import uuid from 'uuid';
import Conditions from './conditions';
import InteractorsTools from '../../../utils/interactorsTools';
import { NavListItem, TextField, Button, Pane, including } from '../../../../../interactors';
import { CONDITION_AND_LIMIT_TYPES } from '../../../constants';

const saveButton = Button('Save');
const limitTypes = Object.values(CONDITION_AND_LIMIT_TYPES);

export default {
  limitTypes,

  waitLoading: () => {
    cy.expect(Pane('Limits').exists());
  },

  verifyLimitTypes() {
    cy.wrap(limitTypes).each((limitName) => {
      this.getLimitIdViaApi(limitName).then((limitId) => {
        cy.expect(TextField({ name: limitId }).exists());
      });
    });
  },

  createViaApi: (patronGroupId, conditionId, value) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'patron-block-limits',
        isDefaultSearchParamsRequired: false,
        body: {
          patronGroupId,
          conditionId,
          value,
          id: uuid(),
        },
      })
      .then((response) => response.body.id);
  },

  getLimitIdViaApi(limitName) {
    return Conditions.getConditionsViaApi().then(
      (conditions) => conditions.find((condition) => condition.name === limitName).id,
    );
  },

  selectGroup(groupName) {
    cy.do(NavListItem(groupName).click());
  },

  setLimit(limitName, number) {
    this.getLimitIdViaApi(limitName).then((limitId) => {
      cy.do([TextField({ name: limitId }).fillIn(number), saveButton.click()]);
    });
  },

  verifySuccessfullyUpdated(groupName) {
    InteractorsTools.checkCalloutMessage(
      `The patron block limit for patron group ${groupName} has been successfully updated.`,
    );
  },

  verifyUpdateValidationError(limitType) {
    this.getLimitIdViaApi(limitType).then((limitId) => {
      cy.expect(
        TextField({ name: limitId }).has({
          error: including('Must be blank or a number from 0 to 999,999'),
        }),
      );
    });
  },

  verifySaveIsDisabled() {
    cy.expect(saveButton.is({ disabled: true }));
  },

  verifyLimitsCantBeChanged() {
    cy.wrap(limitTypes).each((limitName) => {
      this.getLimitIdViaApi(limitName).then((limitId) => {
        cy.expect(TextField({ name: limitId }).is({ disabled: true }));
      });
    });
    this.verifySaveIsDisabled();
  },
};
