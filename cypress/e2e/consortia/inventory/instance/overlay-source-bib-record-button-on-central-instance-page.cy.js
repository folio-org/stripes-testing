import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import Z3950TargetProfiles from '../../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        OCLCAuthentication: '100481406/PAOLF',
        oclcNumber: '1234568',
      };
      const updatedInstanceData = {
        title: 'Rincões dos frutos de ouro (tipos e cenarios do sul baiano) [por] Saboia Ribeiro.',
        language: 'Portuguese',
        publisher: 'P. Simone',
        placeOfPublication: '[Rio de Janeiro?]',
        publicationDate: '1933',
        physicalDescription: '209 pages 19 cm',
        subject: 'Conto brasileiro',
        notes: {
          noteType: 'Formatted Contents Note',
          noteContent:
            'Os ciganos.--O caxixe.--Ferocidade.--Lucio da Florinda.--Gente nativa.--Brios sertanejos.--Destinos.--Vida aspera.--Duas mortes.--Rapsodia do rio',
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
        { tags: ['extendedPathECS', 'folijet', 'C409467'] },
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
          InstanceRecordView.verifyInstanceSubject({
            indexRow: 0,
            subjectHeadings: updatedInstanceData.subject,
            subjectSource: 'No value set-',
            subjectType: 'Topical term',
          });
          InventoryInstance.openInstanceNotesAccordion();
          InventoryInstance.checkInstanceNotes(
            updatedInstanceData.notes.noteType,
            updatedInstanceData.notes.noteContent,
          );
        },
      );
    });
  });
});
