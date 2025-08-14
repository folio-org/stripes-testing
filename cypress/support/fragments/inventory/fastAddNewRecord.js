import { including } from '@interactors/html';
import {
  Button,
  KeyValue,
  MultiColumnListCell,
  Pane,
  PaneHeader,
  Section,
  Select,
  Selection,
  SelectionList,
  TextField,
} from '../../../../interactors';
import { LOCATION_NAMES } from '../../constants';
import getRandomPostfix from '../../utils/stringTools';

const fastAddNewRecordFormDetails = {
  instanceStatusCodeValue: 'uncat',
  resourceTitle: `Monograph${getRandomPostfix()}`,
  resourceType: 'text',
  permanentLocationOption: `${LOCATION_NAMES.MAIN_LIBRARY} `,
  permanentLocationValue: LOCATION_NAMES.MAIN_LIBRARY_UI,
  itemBarcode: `${getRandomPostfix()}Barcode`,
  materialType: 'text',
  permanentLoanType: 'Course reserves',
  note: 'note for monograph',
};

const fillFastAddNewRecordForm = ({
  resourceTitle,
  resourceType,
  permanentLocationOption,
  itemBarcode,
  materialType,
  permanentLoanType,
  note,
}) => {
  cy.do([
    TextField('Resource title*').fillIn(resourceTitle),
    Select('Resource type*').choose(resourceType),
    Selection('Permanent location*').open(),
    SelectionList().filter(permanentLocationOption),
    SelectionList().select(permanentLocationOption),
    TextField('Barcode').fillIn(itemBarcode),
    Select('Material type*').choose(materialType),
    Select('Permanent loan type*').choose(permanentLoanType),
    TextField('Note*').fillIn(note),
  ]);
};

const saveAndClose = () => {
  cy.wait(1500);
  cy.do(Button('Save & close').click());

  cy.expect(Section({ id: 'pane-results' }).find(Button('Actions')).exists());
};

const waitLoading = () => {
  cy.expect(PaneHeader('New fast add record').exists());
};

const openRecordDetails = (row = 0) => {
  cy.do(
    Pane({ id: 'pane-results' })
      .find(MultiColumnListCell({ row, columnIndex: 1 }))
      .click(),
  );

  cy.expect(Section({ id: 'pane-instancedetails' }).exists());
};

const verifyRecordCreatedDate = ({ start, end }) => {
  cy.get('[class^="metaHeaderLabel"]')
    .invoke('text')
    .then((dateText) => {
      const createdAt = new Date(dateText);

      const startedDate = new Date(start.getTime());
      const completedDate = new Date(end.getTime());

      // since created date is displayed in UTC time in UI,
      // current timestamps need to be converted to UTC time
      startedDate.setDate(startedDate.getUTCDate());
      completedDate.setDate(completedDate.getUTCDate());
      startedDate.setHours(startedDate.getUTCHours(), startedDate.getUTCMinutes(), 0, 0);
      completedDate.setHours(completedDate.getUTCHours(), completedDate.getUTCMinutes(), 0, 0);

      expect(startedDate).to.lte(createdAt);
      expect(completedDate).to.gte(createdAt);
    });
};

const viewHoldings = () => {
  cy.do(Button('View holdings').click());

  cy.expect(Section({ id: 'view-holdings-record-pane' }).exists());
};

const verifyPermanentLocation = (value) => {
  cy.expect(KeyValue('Permanent').has({ value: including(value) }));
};

const closeHoldingsRecordView = () => {
  cy.do(
    Section({ id: 'view-holdings-record-pane' })
      .find(Button({ icon: 'times' }))
      .click(),
  );
};

export default {
  fastAddNewRecordFormDetails,
  fillFastAddNewRecordForm,
  saveAndClose,
  waitLoading,
  openRecordDetails,
  verifyRecordCreatedDate,
  viewHoldings,
  verifyPermanentLocation,
  closeHoldingsRecordView,
};
