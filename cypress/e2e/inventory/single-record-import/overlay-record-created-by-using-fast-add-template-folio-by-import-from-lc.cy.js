import uuid from 'uuid';
import { APPLICATION_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FastAddNewRecord from '../../../support/fragments/inventory/fastAddNewRecord';
import instanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

const testData = {
  user: {},
  identifierType: 'LCCN',
  lccnIdentifier: '08020755',
  instanceSource: 'FOLIO',
};
const fastAddRecord = {
  resourceTitle: 'Wayeeses, the white wolf, from "Northern trails,"',
  resourceType: 'text',
  permanentLocationOption: `${LOCATION_NAMES.MAIN_LIBRARY} `,
  permanentLocationValue: LOCATION_NAMES.MAIN_LIBRARY_UI,
  materialType: 'book',
  permanentLoanType: 'Can circulate',
  itemBarcode: uuid(),
  note: 'AT_C196838 Fast Add Note',
};
const updatedInstanceValues = {
  instanceTitle: 'Wayeeses, the white wolf, from "Northern trails,"',
  instanceSource: 'MARC',
  indexTitle: 'Wayeeses, the white wolf, from "Northern trails,"',
  contributorName: 'Long, William J. (William Joseph), 1867-1952',
  publisher: 'Ginn & company',
  publisherRole: '-',
  placeOfPublication: 'Boston ; New York [etc.]',
  publicationDate: '[c1908]',
  date1: '1908',
  date2: 'No value set-',
  dateType: 'Single known date/probable date',

  urlRelationship: 'Version of resource',
  uri: 'http://hdl.loc.gov/loc.gdc/scd0001.00055061130',
  subjectHeadings: 'Wolves',
  subjectSource: 'Library of Congress Subject Headings',
  subjectType: 'Topical term',
};

describe('Inventory', () => {
  describe('Single record import', () => {
    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.inventoryFastAddCreate.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(fastAddRecord.itemBarcode);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C196838 Overlay record created by using Fast add template (instance source = FOLIO) by import of single MARC record from LC (folijet)',
      { tags: ['extendedPath', 'folijet', 'C196838'] },
      () => {
        InventoryActions.openNewFastAddRecordForm();
        FastAddNewRecord.waitLoading();
        FastAddNewRecord.fillFastAddNewRecordForm(fastAddRecord);
        FastAddNewRecord.saveAndClose();
        InstanceRecordView.waitLoading();

        InstanceRecordView.edit();
        instanceRecordEdit.addIdentifier(testData.identifierType, testData.lccnIdentifier);
        InstanceRecordView.waitLoading();

        InstanceRecordView.verifyInstanceSource(testData.instanceSource);
        InstanceRecordView.openAccordion('Identifiers');
        InstanceRecordView.verifyResourceIdentifier(
          testData.identifierType,
          testData.lccnIdentifier,
          0,
        );

        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.overlayWithOclc(testData.lccnIdentifier, 'Library of Congress');
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyInstanceSource(updatedInstanceValues.instanceSource);
        InstanceRecordView.verifyResourceTitle(updatedInstanceValues.instanceTitle);
        InstanceRecordView.verifyIndexTitle(updatedInstanceValues.indexTitle, 0);
        InstanceRecordView.openAccordion('Contributor');
        InventoryInstance.verifyContributor(0, 1, updatedInstanceValues.contributorName);
        InstanceRecordView.verifyPublisher({
          publisher: updatedInstanceValues.publisher,
          role: updatedInstanceValues.publisherRole,
          place: updatedInstanceValues.placeOfPublication,
          date: updatedInstanceValues.publicationDate,
        });
        InstanceRecordView.verifyDates(
          updatedInstanceValues.date1,
          updatedInstanceValues.date2,
          updatedInstanceValues.dateType,
        );
        InventoryInstance.checkElectronicAccessValues(
          updatedInstanceValues.urlRelationship,
          updatedInstanceValues.uri,
          'No value set-',
        );
        InstanceRecordView.openAccordion('Subject');
        InstanceRecordView.verifyInstanceSubject({
          indexRow: 0,
          subjectHeadings: updatedInstanceValues.subjectHeadings,
          subjectSource: updatedInstanceValues.subjectSource,
          subjectType: updatedInstanceValues.subjectType,
        });

        InventoryInstance.viewSource();
        InventoryViewSource.contains('Wayeeses, $b the white wolf, from "Northern trails,"');
      },
    );
  });
});
