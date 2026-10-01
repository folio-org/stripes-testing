import { including } from '@interactors/html';

import HTML from '../baseHTML';
import Button from '../button';
import Selection from '../selection';
import TextField from '../text-field';
import { RepeatableFieldItem } from '../repeatablefield';

export const ACQ_LOCATION_FIELD_NAMES = {
  ID: (index) => `locations[${index}].locationId`,
  QUANTITY_PHYSICAL: (index) => `locations[${index}].quantityPhysical`,
  QUANTITY_ELECTRONIC: (index) => `locations[${index}].quantityElectronic`,
};

/**
 * Interacts with the acquisitions Location repeatable-field array used by PO lines and templates.
 * Row-specific actions stay scoped to the Location section so they do not collide with other
 * repeatable fields on the same form.
 */
export const AcqLocationsFieldArray = HTML.extend('acq locations field array')
  .selector('section[id="location"]')
  .filters({
    rowCount: (el) => el.querySelectorAll('[class^=repeatableFieldItem-]').length,
    selectedLocations: (el) => [...el.querySelectorAll('[class^=repeatableFieldItem-]')].map(
      (row) => row.querySelector('button [class^=singleValue-]')?.textContent.trim() ?? '',
    ),
    physicalQuantities: (el) => [...el.querySelectorAll('input[name$=".quantityPhysical"]')].map((input) => input.value),
    electronicQuantities: (el) => [...el.querySelectorAll('input[name$=".quantityElectronic"]')].map((input) => input.value),
  })
  .actions({
    addRow: (interactor) => interactor.find(Button('Add location')).click(),
    removeRow: (interactor, index = 0) => interactor
      .find(RepeatableFieldItem({ index }))
      .find(Button({ icon: 'trash' }))
      .click(),
    scrollRowIntoView: (interactor, index = 0) => interactor.find(RepeatableFieldItem({ index })).perform((el) => el.scrollIntoView()),
    openLocationSelector: (interactor, index = 0) => interactor
      .find(RepeatableFieldItem({ index }))
      .find(Selection(including('Name (code)')))
      .open(),
    focusPhysicalQuantity: (interactor, index = 0) => interactor
      .find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_PHYSICAL(index) }))
      .focus(),
    resetPhysicalQuantity: (interactor, index = 0) => interactor
      .find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_PHYSICAL(index) }))
      .fillIn(''),
    fillPhysicalQuantity: (interactor, { index = 0, value }) => interactor
      .find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_PHYSICAL(index) }))
      .fillIn(String(value)),
    blurPhysicalQuantity: (interactor, index = 0) => interactor
      .find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_PHYSICAL(index) }))
      .blur(),
    focusElectronicQuantity: (interactor, index = 0) => interactor
      .find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_ELECTRONIC(index) }))
      .focus(),
    resetElectronicQuantity: (interactor, index = 0) => interactor
      .find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_ELECTRONIC(index) }))
      .fillIn(''),
    fillElectronicQuantity: (interactor, { index = 0, value }) => interactor
      .find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_ELECTRONIC(index) }))
      .fillIn(String(value)),
    blurElectronicQuantity: (interactor, index = 0) => interactor
      .find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_ELECTRONIC(index) }))
      .blur(),
  });
