import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/z39.50TargetProfiles';
import DevTeams from '../../../support/dictionary/devTeams';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

let user;
let instanceRecord;
const oclcRecordData = {
  title: 'Cooking Light Soups & Stew [electronic resource].',
  language: 'English',
  publisher: 'TI Inc. Books',
  placeOfPublication: 'Chicago',
  publicationDate: '2020',
  physicalDescription: '1 online resource (142 p.)',
  isbn1: '154785474X',
  isbn2: '9781547854745',
  oclc: '1202462670',
  subject: 'Electronic books',
  notes: { noteType: 'General note', noteContent: 'Description based upon print version of record' }
};

describe('ui-inventory: import by OCLC', () => {
  before('create test data', () => {
    cy.getAdminToken()
      .then(() => {
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi('100473910/PAOLF');
        InventorySearchAndFilter.createInstanceViaApi()
          .then(({ instanceData }) => {
            instanceRecord = instanceData;
          });
      });

    cy.createTempUser([
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
  });

  after('delete test data', () => {
    InventoryInstance.deleteInstanceViaApi(instanceRecord.instanceId);
    Users.deleteViaApi(user.userId);
    Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
  });

  it('C343349 Overlay existing Source = FOLIO Instance by import of single MARC Bib record from OCLC (folijet)', { tags: [testTypes.smoke, DevTeams.folijet] }, () => {
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Keyword (title, contributor, identifier, HRID, UUID)', instanceRecord.instanceTitle);
    InventorySearchAndFilter.selectSearchResultItem();
    InventoryInstance.startOverlaySourceBibRecord();
    InventoryInstance.importWithOclc(oclcRecordData.oclc);
    InventoryInstance.checkCalloutMessage(`Updated record ${oclcRecordData.oclc}`);

    InventoryInstance.waitLoading();
    InventoryInstance.verifyLastUpdatedDate();
    InventoryInstance.verifyInstanceSource('MARC');
    InventoryInstance.verifyInstanceTitle(oclcRecordData.title);

    InventoryInstance.verifyInstanceTitle(oclcRecordData.title);
    InventoryInstance.verifyInstanceLanguage(oclcRecordData.language);
    InventoryInstance.verifyInstancePublisher(0, 0, oclcRecordData.publisher);
    InventoryInstance.verifyInstancePublisher(0, 2, oclcRecordData.placeOfPublication);
    InventoryInstance.verifyInstancePublisher(0, 3, oclcRecordData.publicationDate);
    InventoryInstance.verifyInstancePhisicalcyDescription(oclcRecordData.physicalDescription);
    InventoryInstance.verifyResourceIdentifier('ISBN', oclcRecordData.isbn1, 4);
    InventoryInstance.verifyResourceIdentifier('ISBN', oclcRecordData.isbn2, 5);
    InventoryInstance.verifyInstanceSubject(4, 0, oclcRecordData.subject);
    InventoryInstance.checkInstanceNotes(oclcRecordData.notes.noteType, oclcRecordData.notes.noteContent);

    InventoryInstance.viewSource();
    InventoryViewSource.contains('020\t');
    InventoryViewSource.contains(oclcRecordData.isbn1);
    InventoryViewSource.contains('020\t');
    InventoryViewSource.contains(oclcRecordData.isbn2);
    InventoryViewSource.contains('245\t');
    InventoryViewSource.contains(oclcRecordData.title);
    InventoryViewSource.contains('300\t');
    InventoryViewSource.contains(oclcRecordData.physicalDescription);
    InventoryViewSource.contains('655\t');
    InventoryViewSource.contains(oclcRecordData.subject);
  });
});
