import uuid from 'uuid';
import {
  Button,
  TextField,
  Select,
  Pane,
  Checkbox,
  KeyValue,
  NavListItem,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const saveAndCloseButton = Button('Save & close');
const newButton = Button('New');
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const deleteButton = Button('Delete');
const adjustmentsPane = Pane({ id: 'setting-adjustments-pane' });

const Adjustments = {
  getDefaultPresetAdjustment({
    type,
    value,
    prorate,
    relationToTotal,
    exportToAccounting,
    alwaysShow,
  }) {
    return {
      id: uuid(),
      description: `autotest_adjustment_${getRandomPostfix()}`,
      type,
      value,
      prorate,
      relationToTotal,
      exportToAccounting,
      alwaysShow,
    };
  },

  waitLoading: () => {
    cy.expect(adjustmentsPane.exists());
  },

  clickNew: () => {
    cy.do(newButton.click());
  },

  checkNewAdjustmentForm: () => {
    cy.expect([
      TextField({ name: 'description' }).has({ value: '' }),
      Select({ name: 'type' }).has({ value: 'Amount' }),
      Checkbox({ name: 'alwaysShow' }).has({ checked: true }),
      TextField({ name: 'defaultAmount' }).has({ value: '' }),
      Select({ name: 'prorate' }).has({ value: 'Not prorated' }),
      Select({ name: 'relationToTotal' }).has({ value: 'In addition to' }),
      Checkbox({ name: 'exportToAccounting' }).has({ checked: false }),
    ]);
  },

  fillAdjustmentDetails: (adjustment) => {
    cy.do([
      TextField({ name: 'description' }).fillIn(adjustment.description),
      Select({ name: 'type' }).choose(adjustment.type),
      TextField({ name: 'defaultAmount' }).fillIn(adjustment.value),
      Select({ name: 'prorate' }).choose(adjustment.prorate),
      Select({ name: 'relationToTotal' }).choose(adjustment.relationToTotal),
    ]);
  },

  saveAdjustment: () => {
    cy.do(saveAndCloseButton.click());
  },

  createAdjustment: (adjustment) => {
    Adjustments.fillAdjustmentDetails(adjustment);
    Adjustments.saveAdjustment(adjustment);
  },

  selectAdjustment: (adjustmentDescription) => {
    cy.do(NavListItem({ content: adjustmentDescription }).click());
  },

  checkAdjustmentDetails: (adjustment) => {
    cy.expect([
      KeyValue('Description').has({ value: adjustment.description }),
      KeyValue('Type').has({ value: adjustment.type }),
      KeyValue('Value').has({ value: adjustment.value }),
      KeyValue('Pro rate').has({ value: adjustment.prorate }),
      KeyValue('Relation to total').has({ value: adjustment.relationToTotal }),
    ]);
  },

  checkActionsMenu: () => {
    cy.do(actionsButton.click());
    cy.expect([editButton.exists(), deleteButton.exists()]);
  },
};

export default Adjustments;
