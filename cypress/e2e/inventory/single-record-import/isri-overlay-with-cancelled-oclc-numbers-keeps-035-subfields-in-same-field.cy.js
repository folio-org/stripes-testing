import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Single record import', () => {
    const postfix = getRandomPostfix();
    const OCLCAuthentication = '100481406/PAOLF';
    // Three OCLC numbers that each have cancelled numbers, exercising the $a + $z bug
    const oclcNumbers = ['1299112', '3217041', '2162375'];
    const testData = {
      instanceTitle: `AT_C1453655_MarcBibInstance_${postfix}`,
      instanceId: null,
      user: {},
    };

    const capabSetsToAssign = [
      CapabilitySets.uiInventory,
      CapabilitySets.uiQuickMarcQuickMarcEditor,
      CapabilitySets.uiInventorySingleRecordImport,
    ];

    before('Create MARC instance, configure Z39.50, create user', () => {
      cy.getAdminToken();
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);

      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
        { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
        { tag: '245', content: `$a ${testData.instanceTitle}`, indicators: ['1', '0'] },
      ]).then((createdInstanceId) => {
        testData.instanceId = createdInstanceId;
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });
    });

    it(
      'C1453655 ISRI overlay with cancelled OCLC numbers keeps 035 $a and $z subfields in the same 035 field (promin)',
      { tags: ['criticalPath', 'promin', 'C1453655'] },
      () => {
        oclcNumbers.forEach((oclcNumber) => {
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 1-2: Overlay the instance with the OCLC record
          InventoryInstance.startOverlaySourceBibRecord();
          InventoryInstance.overlayWithOclc(oclcNumber);
          InventoryInstance.checkIdentifier(oclcNumber);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 3: View source
          InventoryInstance.viewSource();

          // Step 4: Verify the 035 OCLC entry has both $a and $z in the SAME row
          InventoryViewSource.checkRowExistsWithTagAndValue(
            '035',
            `$a (OCoLC)${oclcNumber} $z (OCoLC)`,
          );

          // Verify via API that no 035 field has $z without $a (i.e. no split row bug)
          cy.getMarcRecordDataViaAPI(testData.instanceId).then((marcData) => {
            const fields035 = marcData.fields.filter((f) => f.tag === '035');
            fields035.forEach((field) => {
              if (field.content.includes('$z')) {
                expect(
                  field.content,
                  '035 field with $z must also contain $a in the same field',
                ).to.include('$a');
              }
            });
          });

          InventoryViewSource.close();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
        });
      },
    );
  });
});
