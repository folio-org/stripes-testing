import {
  Checkbox,
  Button,
  TextField,
  Spinner,
  MultiColumnListCell,
  Selection,
  SelectionOption,
} from '../../../interactors';
import button from '../../../interactors/button';
import select from '../../../interactors/select';
import textField from '../../../interactors/text-field';
import textarea from '../../../interactors/textarea';
import checkInActions from '../fragments/check-in-actions/checkInActions';
import inventorySearchAndFilter from '../fragments/inventory/inventorySearchAndFilter';
import topMenu from '../fragments/topMenu';
import serviceshift from './serviceshift';

const data = '114545699';
const declaredTextFiled = TextField('itemStatus-field');
const test = '58485788';


export default {
  clickonitem() {
    cy.do(items).click();
  },
  clickonModal() {
    cy.do(Modal({ id:'multipiece-modal' }).find(button('Check in')).click());
  },
  createinstance(barcode) {
    cy.do([
      button('Actions').click(),
      button('New').click(),
      textarea({ id: 'input_instance_title' }).fillIn('test'),
      select({ id: 'select_instance_type' }).choose('other'),
      button('Save & close').click(),
      button({ id: 'clickable-new-holdings-record' }).click(),
      Selection('Permanent*').open(),
      SelectionOption('acq admin (acq,admin) ').click(),
      button('Save & close').click(),
      button('Add item').click(),
      textField({ id:'additem_barcode' }).fillIn(barcode),
      select('Material type*').choose('book'),
      select('Permanent loan type*').choose('10 years'),
    ]);
    cy.expect(button('Save & close').exists());
    cy.do(button('Save & close').click());
    cy.expect(button('Holdings: acq admin >').exists());
  },
  declareditem() {
    cy.do(button({ id: 'accordion-toggle-button-loan' }).click());
    cy.do([Checkbox({ id: 'clickable-filter-loan-declared-lost' }).click()]);
    cy.wrap(MultiColumnListCell({ row: 0, columnIndex: 1 }).text()).as(
      'barcode'
    );
    cy.get('@barcode').then((val) => {
      cy.visit(topMenu.checkInPath);
      checkInActions.checkInItem(val);
      serviceshift.clickClose();
    });
  },
  withdrawn() {
    inventorySearchAndFilter.switchToItem();
    cy.do(Button({ id: 'accordion-toggle-button-itemStatus' }).click());
    cy.expect([Spinner().exists(), Checkbox('Available').exists()]);
    cy.do([declaredTextFiled.click(), declaredTextFiled.fillIn('withdrawn')]);
    cy.do([Checkbox({ id: 'clickable-filter-itemStatus-withdrawn' }).click()]);
    inventorySearchAndFilter.clickSearchResultItem();
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(data);
    serviceshift.clickClose();
  },
  lostandpaid() {
    inventorySearchAndFilter.switchToItem();
    cy.do(Button({ id: 'accordion-toggle-button-itemStatus' }).click());
    cy.expect([Spinner().exists(), Checkbox('Available').exists()]);
    cy.expect(Checkbox('Available').exists());
    cy.do([declaredTextFiled.click(), declaredTextFiled.fillIn('lost and')]);
    cy.do([
      Checkbox({ id: 'clickable-filter-itemStatus-lost-and-paid' }).click(),
    ]);
    inventorySearchAndFilter.selectSearchResultItem();
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(test);
    serviceshift.clickClose();
  },
};
