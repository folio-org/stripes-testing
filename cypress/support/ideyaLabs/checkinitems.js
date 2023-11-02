import {
  Button,
  Checkbox,
  Modal,
  MultiColumnListCell,
  Select,
  Selection,
  SelectionOption,
  Spinner,
  TextField,
} from '../../../interactors';
import checkInActions from '../fragments/check-in-actions/checkInActions';
import inventorySearchAndFilter from '../fragments/inventory/inventorySearchAndFilter';
import topMenu from '../fragments/topMenu';
import serviceShift from './serviceshift';

const itemStatusSearchField = TextField('itemStatus-field');
const itemBarcode = '58485788';
const date = '2023-07-21';

export default {
  clickOnItem() {
    // eslint-disable-next-line no-undef
    cy.do(items).click();
  },

  checkModal() {
    cy.expect(Modal({ id: 'multipiece-modal' }).exists());
    cy.do(Modal({ id: 'multipiece-modal' }).find(Button('Check in')).click());
  },

  createInstance() {
    cy.do([
      Button('Actions').click(),
      Button('New').click(),
      TextField({ id: 'input_instance_title' }).fillIn('test'),
      Select({ id: 'select_instance_type' }).choose('other'),
      Button('Save & close').click(),
    ]);
    cy.expect(Button({ id: 'clickable-new-holdings-record' }).exists());
  },

  createItem(barcode) {
    cy.do([
      Button('Date created').click(),
      TextField({ name: 'startDate' }).fillIn(date),
      TextField({ name: 'endDate' }).fillIn(date),
      Button('Apply').click(),
    ]);
    inventorySearchAndFilter.clickSearchResultItem();
    cy.expect(Button({ id: 'clickable-new-holdings-record' }).exists());
    cy.do([
      Button({ id: 'clickable-new-holdings-record' }).click(),
      Selection('Permanent*').open(),
      SelectionOption('acq admin (acq,admin) ').click(),
      Button('Save & close').click(),
      cy.expect(Button('Add item').exists()),
    ]);
    cy.expect(Button('Holdings: acq admin >').exists());
    cy.do([
      Button('Add item').click(),
      TextField({ id: 'additem_barcode' }).fillIn(barcode),
      Select('Material type*').choose('book'),
      Select('Permanent loan type*').choose('10 years'),
    ]);
    cy.expect(Button('Save & close').exists());
    cy.do(Button('Save & close').click());
    cy.expect(Button('Holdings: acq admin >').exists());
  },

  declaredItem() {
    cy.do(Button({ id: 'accordion-toggle-button-loan' }).click());
    cy.do([Checkbox({ id: 'clickable-filter-loan-declared-lost' }).click()]);
    cy.wrap(MultiColumnListCell({ row: 0, columnIndex: 1 }).text()).as('barcode');
    cy.get('@barcode').then((val) => {
      cy.visit(topMenu.checkInPath);
      checkInActions.checkInItem(val);
      serviceShift.clickClose();
    });
  },

  withdrawn() {
    inventorySearchAndFilter.switchToItem();
    cy.do(Button({ id: 'accordion-toggle-button-itemStatus' }).click());
    cy.expect([Spinner().exists(), Checkbox('Available').exists()]);
    cy.do([itemStatusSearchField.click(), itemStatusSearchField.fillIn('withdrawn')]);
    cy.do([Checkbox({ id: 'clickable-filter-itemStatus-withdrawn' }).click()]);
    inventorySearchAndFilter.clickSearchResultItem();
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(itemBarcode);
    serviceShift.clickClose();
  },

  lostAndPaid() {
    inventorySearchAndFilter.switchToItem();
    cy.do(Button({ id: 'accordion-toggle-button-itemStatus' }).click());
    cy.expect([Spinner().exists(), Checkbox('Available').exists()]);
    cy.expect(Checkbox('Available').exists());
    cy.do([itemStatusSearchField.click(), itemStatusSearchField.fillIn('lost and')]);
    cy.do([Checkbox({ id: 'clickable-filter-itemStatus-lost-and-paid' }).click()]);
    inventorySearchAndFilter.selectSearchResultItem();
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(itemBarcode);
    serviceShift.clickClose();
  },

  checkIn: (barcode) => {
    cy.do([TextField('Item ID').fillIn(barcode), Button('Enter').click()]);
  },

  checkInMultipleItem: (barcode) => {
    cy.do([
      TextField('Item ID').fillIn(barcode),
      Button('Enter').click(),
      Modal('Confirm multipiece check in').find(Button('Check in')).click(),
    ]);
  },

  cancelCheckInMultipleItem: (barcode) => {
    cy.do([
      TextField('Item ID').fillIn(barcode),
      Button('Enter').click(),
      Button('Cancel').click(),
    ]);
  },
};
