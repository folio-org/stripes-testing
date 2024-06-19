import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import Z3950TargetProfiles from '../../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      OCLCAuthentication: '100481406/PAOLF',
      oclcNumber: '1234568',
    };
    const updatedInstanceData = {
      title:
        'Dictionary of Louisiana French : as spoken in Cajun, Creole, and American Indian communities / Albert Valdman, editor ; Kevin J. Rottet, associate editor.',
      language: 'English, French',
      publisher: 'University Press of Mississippi',
      placeOfPublication: 'Jackson',
      publicationDate: '2010',
      physicalDescription: 'XL, 892 S',
      subject: 'French language--Dialects--Louisiana--Dictionaries',
      notes: {
        noteType: 'Bibliography note',
        noteContent: 'Includes bibliographical references and index',
      },
    };

    before('Create test data', () => {
      cy.getAdminToken();
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
      });

      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySingleRecordImport.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C409467 (CONSORTIA) Verify the " Overlay source bibliographic record" button on Central tenant Instance page (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.overlayWithOclc(testData.oclcNumber);
        InventoryInstance.waitLoading();

        // check instance is updated
        InventoryInstance.verifyInstanceTitle(updatedInstanceData.title);
        InventoryInstance.verifyInstanceLanguage(updatedInstanceData.language);
        InventoryInstance.verifyInstancePublisher({
          publisher: updatedInstanceData.publisher,
          place: updatedInstanceData.placeOfPublication,
          date: updatedInstanceData.publicationDate,
        });
        InventoryInstance.verifyInstancePhysicalcyDescription(
          updatedInstanceData.physicalDescription,
        );
        InventoryInstance.openSubjectAccordion();
        InventoryInstance.verifyInstanceSubject(0, 0, updatedInstanceData.subject);
        InventoryInstance.checkInstanceNotes(
          updatedInstanceData.notes.noteType,
          updatedInstanceData.notes.noteContent,
        );
      },
    );
  });
});
