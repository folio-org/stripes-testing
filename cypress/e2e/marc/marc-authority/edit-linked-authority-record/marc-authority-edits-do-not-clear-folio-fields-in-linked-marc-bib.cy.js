import { APPLICATION_NAMES, INSTANCE_STATUS_TERM_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InstanceStatusTypes from '../../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NatureOfContent from '../../../../support/fragments/settings/inventory/instances/natureOfContent';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(10);
      const randomDigits = randomNDigitNumber(8);

      const testData = {
        tag100: '100',
        tag010: '010',
        tag700: '700',
        authorityHeading1: 'Stelfreeze, Brian',
        authorityHeading2: 'Sprouse, Chris',
        updated1XXValue: '$a Stelfreeze, Brian Updated',
        updated010Value: '$a nb 98017695',
        updated010Url: 'http://id.loc.gov/authorities/names/nb98017695',
        instanceTitle: `AT_C1292048_MarcBibInstance_${randomPostfix}`,
        parentInstanceTitle: `AT_C1292048_ParentInstance_${randomPostfix}`,
        childInstanceTitle: `AT_C1292048_ChildInstance_${randomPostfix}`,
        catalogedDate: DateTools.getFormattedDate({ date: new Date() }),
        instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.CATALOGED,
        statisticalCodeType: 'ARL (Collection stats)',
        statisticalCode: null,
        administrativeNote: `C1292048 admin note ${randomPostfix}`,
        natureOfContent: null,
        tagName: 'c1292048',
      };

      const authData = {
        prefix: randomLetters,
        startWithNumber: `C1292048${randomDigits}`,
        get hrid1() {
          return `${this.prefix}${this.startWithNumber}1`;
        },
      };

      const linkingTagsAndValues = [
        {
          bibFieldIndex: 5,
          value: '$a Stelfreeze, Brian $e artist.',
          tag: '700',
          authorityTag: '100',
        },
        {
          bibFieldIndex: 6,
          value: '$a Sprouse, Chris $e artist.',
          tag: '700',
          authorityTag: '100',
        },
      ];

      const marcBibFields = [
        {
          tag: '008',
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: '245',
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '\\'],
        },
        {
          tag: '700',
          content: '$a Stelfreeze, Brian $e artist.',
          indicators: ['1', '\\'],
        },
        {
          tag: '700',
          content: '$a Sprouse, Chris $e artist.',
          indicators: ['1', '\\'],
        },
      ];

      let instanceId;
      let parentInstanceId;
      let parentInstanceHrid;
      let childInstanceId;
      let childInstanceHrid;
      const authorityIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('Stelfreeze, Brian');
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('Sprouse, Chris');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.enableStaffSuppressFacet.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (createdInstanceId) => {
                instanceId = createdInstanceId;
              },
            );

            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              `${authData.startWithNumber}1`,
              [
                {
                  tag: testData.tag100,
                  content: `$a ${testData.authorityHeading1}`,
                  indicators: ['1', '\\'],
                },
              ],
            ).then((createdAuthorityId) => {
              authorityIDs.push(createdAuthorityId);
            });

            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              `${authData.startWithNumber}2`,
              [
                {
                  tag: testData.tag010,
                  content: '$a nb 98017694',
                  indicators: ['\\', '\\'],
                },
                {
                  tag: testData.tag100,
                  content: `$a ${testData.authorityHeading2}`,
                  indicators: ['1', '\\'],
                },
              ],
            ).then((createdAuthorityId) => {
              authorityIDs.push(createdAuthorityId);
            });
          })
            .then(() => {
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: instanceId,
                authorityIds: [authorityIDs[0], authorityIDs[1]],
                bibFieldTags: [testData.tag700, testData.tag700],
                authorityFieldTags: [testData.tag100, testData.tag100],
                finalBibFieldContents: [
                  linkingTagsAndValues[0].value,
                  linkingTagsAndValues[1].value,
                ],
                bibFieldIndexes: [
                  linkingTagsAndValues[0].bibFieldIndex,
                  linkingTagsAndValues[1].bibFieldIndex,
                ],
              });
            })
            .then(() => {
              cy.getInstanceById(instanceId).then((instanceData) => {
                InstanceStatusTypes.getViaApi({
                  query: `name=="${testData.instanceStatusTerm}"`,
                }).then((statuses) => {
                  NatureOfContent.getFirstViaApi().then((natureOfContentTerm) => {
                    testData.natureOfContent = natureOfContentTerm.name;
                    cy.getStatisticalCodeTypes({
                      query: `name=="${testData.statisticalCodeType}"`,
                    }).then((types) => {
                      cy.getStatisticalCodes({
                        query: `statisticalCodeTypeId=="${types[0].id}"`,
                      }).then((codes) => {
                        testData.statisticalCode = codes[0].name;
                        InventoryInstance.createInstanceViaApi({
                          instanceTitle: testData.parentInstanceTitle,
                        }).then(({ instanceData: parentData }) => {
                          parentInstanceId = parentData.instanceId;
                          cy.getInstanceById(parentInstanceId).then((parent) => {
                            parentInstanceHrid = parent.hrid;
                          });
                        });
                        InventoryInstance.createInstanceViaApi({
                          instanceTitle: testData.childInstanceTitle,
                        }).then(({ instanceData: childData }) => {
                          childInstanceId = childData.instanceId;
                          cy.getInstanceById(childInstanceId).then((child) => {
                            childInstanceHrid = child.hrid;
                          });
                        });
                        InventoryInstance.getInstanceRelationshipTypesViaApi().then(
                          (relationshipTypes) => {
                            const relationshipTypeId = relationshipTypes[0].id;
                            cy.updateInstance({
                              ...instanceData,
                              discoverySuppress: true,
                              staffSuppress: true,
                              previouslyHeld: true,
                              catalogedDate: testData.catalogedDate,
                              statusId: statuses[0].id,
                              statisticalCodeIds: [codes[0].id],
                              administrativeNotes: [testData.administrativeNote],
                              natureOfContentTermIds: [natureOfContentTerm.id],
                              tags: { tagList: [testData.tagName] },
                              parentInstances: [
                                {
                                  superInstanceId: parentInstanceId,
                                  instanceRelationshipTypeId: relationshipTypeId,
                                },
                              ],
                              childInstances: [
                                {
                                  subInstanceId: childInstanceId,
                                  instanceRelationshipTypeId: relationshipTypeId,
                                },
                              ],
                            });
                          },
                        );
                      });
                    });
                  });
                });
              });
            })
            .then(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.userProperties.userId);
          authorityIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
        });
      });

      it(
        'C1292048 Verify that MARC authority record edits do not clear FOLIO fields in linked MARC bib records (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C1292048'] },
        () => {
          // Step 1. Open first linked authority record (Stelfreeze, Brian) and click Edit
          MarcAuthorities.searchBy('Keyword', testData.authorityHeading1);
          MarcAuthorities.selectTitle(testData.authorityHeading1);
          MarcAuthority.edit();

          // Step 2. Update $a subfield of 1XX field
          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updated1XXValue);

          // Step 3. Save & close and confirm in modal
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibs(1);

          // Step 4. Go to Inventory and open linked instance - verify FOLIO fields are not cleared
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
          InstanceRecordView.verifyInstanceIsMarkedAsPreviouslyHeld();
          InstanceRecordView.verifyCatalogedDate(testData.catalogedDate);
          InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
          InstanceRecordView.verifyStatisticalCode(testData.statisticalCode);
          InstanceRecordView.verifyAdministrativeNote(testData.administrativeNote);
          InstanceRecordView.verifyNatureOfContent(testData.natureOfContent);
          InstanceRecordView.verifyParentInstanceTitle(testData.parentInstanceTitle);
          InstanceRecordView.verifyChildInstanceTitle(testData.childInstanceTitle);
          InventoryInstance.openTagsPane();
          InventoryInstance.checkTagSelectedInDropdown(testData.tagName);

          // Step 5. Click Actions - Edit MARC bibliographic record
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            linkingTagsAndValues[0].bibFieldIndex,
            linkingTagsAndValues[0].tag,
            '1',
            '\\',
            testData.updated1XXValue,
            '$e artist.',
            `$0 ${authData.hrid1}`,
            '',
          );

          // Step 6. Close quickmarc pane, then click Actions - Edit
          QuickMarcEditor.closeWithoutSaving();
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.verifyDiscoverySuppressCheckbox(true);
          InstanceRecordEdit.verifyStaffSuppressCheckbox(true);
          InstanceRecordEdit.verifyPreviouslyHeldCheckbox(true);
          InstanceRecordEdit.verifyCatalogedDateField(testData.catalogedDate);
          InstanceRecordEdit.verifyInstanceStatusTermSelected(testData.instanceStatusTerm);
          InstanceRecordEdit.verifyStatisticalCodeSelected(testData.statisticalCode);
          InstanceRecordEdit.verifyAdministrativeNote(testData.administrativeNote);
          InstanceRecordEdit.verifyNatureOfContentSelected(testData.natureOfContent);
          InstanceRecordEdit.verifyParentInstance(testData.parentInstanceTitle, parentInstanceHrid);
          InstanceRecordEdit.verifyChildInstance(testData.childInstanceTitle, childInstanceHrid);
          InstanceRecordEdit.close();

          // Step 7. Go to MARC authority app and open second linked authority record (Sprouse, Chris)
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBy('Keyword', testData.authorityHeading2);
          MarcAuthorities.selectTitle(testData.authorityHeading2);

          // Step 8. Click Edit on the second authority record
          MarcAuthority.edit();

          // Step 9. Update $a subfield of 010 field
          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag010, testData.updated010Value);

          // Step 10. Save & close and confirm in modal
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibs(1);

          // Step 11. Repeat steps 4-6: go to Inventory, verify FOLIO fields are still not cleared
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstance.waitLoading();

          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
          InstanceRecordView.verifyInstanceIsMarkedAsPreviouslyHeld();
          InstanceRecordView.verifyCatalogedDate(testData.catalogedDate);
          InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
          InstanceRecordView.verifyStatisticalCode(testData.statisticalCode);
          InstanceRecordView.verifyAdministrativeNote(testData.administrativeNote);
          InstanceRecordView.verifyNatureOfContent(testData.natureOfContent);
          InstanceRecordView.verifyParentInstanceTitle(testData.parentInstanceTitle);
          InstanceRecordView.verifyChildInstanceTitle(testData.childInstanceTitle);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            linkingTagsAndValues[1].bibFieldIndex,
            linkingTagsAndValues[1].tag,
            '1',
            '\\',
            `$a ${testData.authorityHeading2}`,
            '$e artist.',
            `$0 ${testData.updated010Url}`,
            '',
          );
          QuickMarcEditor.closeWithoutSaving();
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.verifyDiscoverySuppressCheckbox(true);
          InstanceRecordEdit.verifyStaffSuppressCheckbox(true);
          InstanceRecordEdit.verifyPreviouslyHeldCheckbox(true);
          InstanceRecordEdit.verifyCatalogedDateField(testData.catalogedDate);
          InstanceRecordEdit.verifyInstanceStatusTermSelected(testData.instanceStatusTerm);
          InstanceRecordEdit.verifyStatisticalCodeSelected(testData.statisticalCode);
          InstanceRecordEdit.verifyAdministrativeNote(testData.administrativeNote);
          InstanceRecordEdit.verifyNatureOfContentSelected(testData.natureOfContent);
          InstanceRecordEdit.verifyParentInstance(testData.parentInstanceTitle, parentInstanceHrid);
          InstanceRecordEdit.verifyChildInstance(testData.childInstanceTitle, childInstanceHrid);
          InstanceRecordEdit.close();

          // Step 12-13. Go to MARC authority app, open second linked authority (Sprouse, Chris)
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBy('Keyword', testData.authorityHeading2);
          MarcAuthorities.selectTitle(testData.authorityHeading2);

          // Step 13. Delete the second linked authority record
          MarcAuthoritiesDelete.clickDeleteButton();
          MarcAuthoritiesDelete.checkDeleteModal();
          MarcAuthoritiesDelete.confirmDelete();
          MarcAuthoritiesDelete.verifyDeleteComplete(testData.authorityHeading2);

          // Step 14. Go to Inventory, open linked instance - verify FOLIO fields are not cleared
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstance.waitLoading();

          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
          InstanceRecordView.verifyInstanceIsMarkedAsPreviouslyHeld();
          InstanceRecordView.verifyCatalogedDate(testData.catalogedDate);
          InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
          InstanceRecordView.verifyStatisticalCode(testData.statisticalCode);
          InstanceRecordView.verifyAdministrativeNote(testData.administrativeNote);
          InstanceRecordView.verifyNatureOfContent(testData.natureOfContent);
          InstanceRecordView.verifyParentInstanceTitle(testData.parentInstanceTitle);
          InstanceRecordView.verifyChildInstanceTitle(testData.childInstanceTitle);

          // Step 15. Click Actions - Edit MARC bibliographic record - verify 2nd linked field is unlinked
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyRowLinked(linkingTagsAndValues[1].bibFieldIndex, false);

          // Step 16. Close quickmarc pane, click Actions - Edit - verify FOLIO fields not cleared
          QuickMarcEditor.closeWithoutSaving();
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.verifyDiscoverySuppressCheckbox(true);
          InstanceRecordEdit.verifyStaffSuppressCheckbox(true);
          InstanceRecordEdit.verifyPreviouslyHeldCheckbox(true);
          InstanceRecordEdit.verifyCatalogedDateField(testData.catalogedDate);
          InstanceRecordEdit.verifyInstanceStatusTermSelected(testData.instanceStatusTerm);
          InstanceRecordEdit.verifyStatisticalCodeSelected(testData.statisticalCode);
          InstanceRecordEdit.verifyAdministrativeNote(testData.administrativeNote);
          InstanceRecordEdit.verifyNatureOfContentSelected(testData.natureOfContent);
          InstanceRecordEdit.verifyParentInstance(testData.parentInstanceTitle, parentInstanceHrid);
          InstanceRecordEdit.verifyChildInstance(testData.childInstanceTitle, childInstanceHrid);
          InstanceRecordEdit.close();
        },
      );
    });
  });
});
