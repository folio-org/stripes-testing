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
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

const testData = {
  user: {},
  identifierType: 'OCLC',
  oclcIdentifier: '949639961',
  OCLCAuthentication: '100481406/PAOLF',
  instanceSource: 'FOLIO',
};
const fastAddRecord = {
  resourceTitle: 'The wolves / Alex Berenson.',
  resourceType: 'text',
  permanentLocationOption: `${LOCATION_NAMES.MAIN_LIBRARY} `,
  permanentLocationValue: LOCATION_NAMES.MAIN_LIBRARY_UI,
  materialType: 'book',
  permanentLoanType: 'Can circulate',
  itemBarcode: uuid(),
  note: 'AT_C196837 Fast Add Note',
};
const updatedInstanceValues = {
  instanceTitle: 'The wolves / Alex Berenson.',
  instanceSource: 'MARC',
  indexTitle: 'Wolves /',
  seriesStatement: 'Berenson, Alex. John Wells novel ; bk. 10.',
  contributorName: 'Berenson, Alex',
  publisher: "G.P. Putnam's Sons",
  publisherRole: 'Publication',
  placeOfPublication: 'New York',
  publicationDate: '2017',
  edition: "First G.P. Putnam's Sons premium edition.",
  date1: '2017',
  date2: '2016',
  dateType: 'Publication date and copyright date',
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

        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);

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
      'C196837 Overlay record created by using Fast add template (instance source = FOLIO) by import of single MARC record from OCLC (folijet)',
      { tags: ['extendedPath', 'folijet', 'C196837'] },
      () => {
        InventoryActions.openNewFastAddRecordForm();
        FastAddNewRecord.waitLoading();
        FastAddNewRecord.fillFastAddNewRecordForm(fastAddRecord);
        FastAddNewRecord.saveAndClose();
        InstanceRecordView.waitLoading();

        InstanceRecordView.edit();
        instanceRecordEdit.addIdentifier(testData.identifierType, testData.oclcIdentifier);
        InstanceRecordView.waitLoading();

        InstanceRecordView.verifyInstanceSource(testData.instanceSource);
        InstanceRecordView.openAccordion('Identifiers');
        InstanceRecordView.verifyResourceIdentifier(
          testData.identifierType,
          testData.oclcIdentifier,
          0,
        );

        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.overlayWithOclc(testData.oclcIdentifier);
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyInstanceSource(updatedInstanceValues.instanceSource);
        InstanceRecordView.verifyResourceTitle(updatedInstanceValues.instanceTitle);
        InstanceRecordView.verifyIndexTitle(updatedInstanceValues.indexTitle, 0);
        InventoryInstance.verifySeriesStatement(0, updatedInstanceValues.seriesStatement);
        InstanceRecordView.openAccordion('Contributor');
        InventoryInstance.verifyContributor(0, 1, updatedInstanceValues.contributorName);
        InstanceRecordView.verifyPublisher({
          publisher: updatedInstanceValues.publisher,
          role: updatedInstanceValues.publisherRole,
          place: updatedInstanceValues.placeOfPublication,
          date: updatedInstanceValues.publicationDate,
        });
        InstanceRecordView.verifyEdition(updatedInstanceValues.edition, 0);
        InstanceRecordView.verifyDates(
          updatedInstanceValues.date1,
          updatedInstanceValues.date2,
          updatedInstanceValues.dateType,
        );

        InventoryInstance.viewSource();
        InventoryViewSource.contains('$a The wolves / $c Alex Berenson.');
      },
    );
  });
});
