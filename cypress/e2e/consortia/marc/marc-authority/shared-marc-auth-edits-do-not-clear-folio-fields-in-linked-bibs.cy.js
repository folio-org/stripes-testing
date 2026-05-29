import { APPLICATION_NAMES, INSTANCE_STATUS_TERM_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InstanceStatusTypes from '../../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NatureOfContent from '../../../../support/fragments/settings/inventory/instances/natureOfContent';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(10);
        const randomDigits = randomNDigitNumber(8);

        const testData = {
          tag100: '100',
          tag700: '700',
          authorityHeading: `Stelfreeze, Brian ${randomPostfix}`,
          updated1XXValue: `$a Stelfreeze, Brian ${randomPostfix} Updated`,
          sharedInstanceTitle: `AT_C1307993_SharedBib_${randomPostfix}`,
          localInstanceTitle: `AT_C1307993_LocalBib_${randomPostfix}`,
          sharedParentInstanceTitle: `AT_C1307993_SharedParent_${randomPostfix}`,
          sharedChildInstanceTitle: `AT_C1307993_SharedChild_${randomPostfix}`,
          localParentInstanceTitle: `AT_C1307993_LocalParent_${randomPostfix}`,
          localChildInstanceTitle: `AT_C1307993_LocalChild_${randomPostfix}`,
          catalogedDate: DateTools.getFormattedDate({ date: new Date() }),
          instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.CATALOGED,
          statisticalCodeType: 'ARL (Collection stats)',
          sharedStatisticalCode: null,
          localStatisticalCode: null,
          administrativeNote: `C1307993 admin note ${randomPostfix}`,
          sharedNatureOfContent: null,
          localNatureOfContent: null,
          tagName: 'c1307993',
          heldByAccordionName: 'Held by',
          searchOption: 'Keyword',
        };

        const authData = {
          prefix: randomLetters,
          startWithNumber: `C1307993${randomDigits}`,
          get hrid() {
            return `${this.prefix}${this.startWithNumber}1`;
          },
        };

        const linkingTagAndValue = {
          bibFieldIndex: 5,
          value: `$a ${testData.authorityHeading} $e artist.`,
          tag: '700',
          authorityTag: '100',
        };

        const marcBibFields = (instanceTitle) => [
          {
            tag: '008',
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: '245',
            content: `$a ${instanceTitle}`,
            indicators: ['1', '\\'],
          },
          {
            tag: '700',
            content: `$a ${testData.authorityHeading} $e artist.`,
            indicators: ['1', '\\'],
          },
        ];

        let authorityId;
        let sharedInstanceId;
        let sharedParentInstanceId;
        let sharedParentInstanceHrid;
        let sharedChildInstanceId;
        let sharedChildInstanceHrid;
        let localInstanceId;
        let localParentInstanceId;
        let localParentInstanceHrid;
        let localChildInstanceId;
        let localChildInstanceHrid;

        const setFolioFieldsForInstance = (instanceId, parentId, childId, prefix) => {
          cy.getInstanceById(instanceId).then((instanceData) => {
            InstanceStatusTypes.getViaApi({
              query: `name=="${testData.instanceStatusTerm}"`,
            }).then((statuses) => {
              NatureOfContent.getFirstViaApi().then((natureOfContentTerm) => {
                testData[`${prefix}NatureOfContent`] = natureOfContentTerm.name;
                cy.getStatisticalCodeTypes({
                  query: `name=="${testData.statisticalCodeType}"`,
                }).then((types) => {
                  cy.getStatisticalCodes({
                    query: `statisticalCodeTypeId=="${types[0].id}"`,
                  }).then((codes) => {
                    testData[`${prefix}StatisticalCode`] = codes[0].name;
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
                              superInstanceId: parentId,
                              instanceRelationshipTypeId: relationshipTypeId,
                            },
                          ],
                          childInstances: [
                            {
                              subInstanceId: childId,
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
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeading);

          // Create Shared MARC Authority in Central
          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            `${authData.startWithNumber}1`,
            [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['1', '\\'],
              },
            ],
          ).then((createdAuthorityId) => {
            authorityId = createdAuthorityId;
          });

          // Create Shared MARC bib + parent/child instances in Central
          cy.then(() => {
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcBibFields(testData.sharedInstanceTitle),
            ).then((id) => {
              sharedInstanceId = id;
            });
            InventoryInstance.createInstanceViaApi({
              instanceTitle: testData.sharedParentInstanceTitle,
            }).then(({ instanceData: parentData }) => {
              sharedParentInstanceId = parentData.instanceId;
              cy.getInstanceById(sharedParentInstanceId).then((parent) => {
                sharedParentInstanceHrid = parent.hrid;
              });
            });
            InventoryInstance.createInstanceViaApi({
              instanceTitle: testData.sharedChildInstanceTitle,
            }).then(({ instanceData: childData }) => {
              sharedChildInstanceId = childData.instanceId;
              cy.getInstanceById(sharedChildInstanceId).then((child) => {
                sharedChildInstanceHrid = child.hrid;
              });
            });
          })
            .then(() => {
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: sharedInstanceId,
                authorityIds: [authorityId],
                bibFieldTags: [testData.tag700],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [linkingTagAndValue.value],
                bibFieldIndexes: [linkingTagAndValue.bibFieldIndex],
              });
            })
            .then(() => {
              setFolioFieldsForInstance(
                sharedInstanceId,
                sharedParentInstanceId,
                sharedChildInstanceId,
                'shared',
              );
            });

          // Create Local MARC bib + parent/child instances in Member tenant
          cy.then(() => {
            cy.setTenant(Affiliations.College);
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcBibFields(testData.localInstanceTitle),
            ).then((id) => {
              localInstanceId = id;
            });
            InventoryInstance.createInstanceViaApi({
              instanceTitle: testData.localParentInstanceTitle,
            }).then(({ instanceData: parentData }) => {
              localParentInstanceId = parentData.instanceId;
              cy.getInstanceById(localParentInstanceId).then((parent) => {
                localParentInstanceHrid = parent.hrid;
              });
            });
            InventoryInstance.createInstanceViaApi({
              instanceTitle: testData.localChildInstanceTitle,
            }).then(({ instanceData: childData }) => {
              localChildInstanceId = childData.instanceId;
              cy.getInstanceById(localChildInstanceId).then((child) => {
                localChildInstanceHrid = child.hrid;
              });
            });
          })
            .then(() => {
              cy.setTenant(Affiliations.College);
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: localInstanceId,
                authorityIds: [authorityId],
                bibFieldTags: [testData.tag700],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [linkingTagAndValue.value],
                bibFieldIndexes: [linkingTagAndValue.bibFieldIndex],
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              setFolioFieldsForInstance(
                localInstanceId,
                localParentInstanceId,
                localChildInstanceId,
                'local',
              );
            });

          // Create user with permissions in Central + Member
          cy.then(() => {
            cy.resetTenant();
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.enableStaffSuppressFacet.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            ]).then((createdUserProperties) => {
              testData.userProperties = createdUserProperties;

              cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.enableStaffSuppressFacet.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              ]);

              cy.resetTenant();
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          MarcAuthority.deleteViaAPI(authorityId, true);
          // Cleanup Shared instances in Central
          cy.recurse(
            () => cy.getInstanceLinks(sharedInstanceId),
            (response) => response.body.links.length === 0,
            { limit: 10, timeout: 12000, delay: 1000 },
          );
          cy.wait(2000);
          cy.getInstanceById(sharedInstanceId).then((instanceData) => {
            cy.updateInstance({
              ...instanceData,
              parentInstances: [],
              childInstances: [],
            });
          });
          InventoryInstance.deleteInstanceViaApi(sharedInstanceId);
          InventoryInstance.deleteInstanceViaApi(sharedParentInstanceId);
          InventoryInstance.deleteInstanceViaApi(sharedChildInstanceId);

          // Cleanup Local instances in Member
          cy.setTenant(Affiliations.College);
          cy.recurse(
            () => cy.getInstanceLinks(localInstanceId),
            (response) => response.body.links.length === 0,
            { limit: 10, timeout: 12000, delay: 1000 },
          );
          cy.wait(2000);
          cy.getInstanceById(localInstanceId).then((instanceData) => {
            cy.updateInstance({
              ...instanceData,
              parentInstances: [],
              childInstances: [],
            });
          });
          InventoryInstance.deleteInstanceViaApi(localInstanceId);
          InventoryInstance.deleteInstanceViaApi(localParentInstanceId);
          InventoryInstance.deleteInstanceViaApi(localChildInstanceId);
        });

        it(
          'C1307993 Verify that Shared MARC authority record edits do not clear FOLIO fields in linked Shared, Local MARC bib records (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C1307993'] },
          () => {
            // Step 1. Open Shared MARC authority record - click Actions > Edit
            MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading);
            MarcAuthorities.selectTitle(`Shared\n${testData.authorityHeading}`);
            MarcAuthority.edit();

            // Step 2. Update $a subfield of 1XX field
            cy.wait(2000);
            QuickMarcEditor.updateExistingField(testData.tag100, testData.updated1XXValue);

            // Step 3. Save & close, confirm in modal
            QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
            QuickMarcEditor.confirmUpdateLinkedBibs(1);

            // Step 4. Go to Inventory and open linked Shared Instance - verify FOLIO fields and tags not cleared
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(sharedInstanceId);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();

            InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
            InstanceRecordView.verifyInstanceIsMarkedAsPreviouslyHeld();
            InstanceRecordView.verifyCatalogedDate(testData.catalogedDate);
            InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
            InstanceRecordView.verifyStatisticalCode(testData.sharedStatisticalCode);
            InstanceRecordView.verifyAdministrativeNote(testData.administrativeNote);
            InstanceRecordView.verifyNatureOfContent(testData.sharedNatureOfContent);
            InstanceRecordView.verifyParentInstanceTitle(testData.sharedParentInstanceTitle);
            InstanceRecordView.verifyChildInstanceTitle(testData.sharedChildInstanceTitle);
            InventoryInstance.openTagsPane();
            InventoryInstance.checkTagSelectedInDropdown(testData.tagName);

            // Step 5. Click Actions > Edit MARC bibliographic record - verify linked field is updated
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              linkingTagAndValue.bibFieldIndex,
              linkingTagAndValue.tag,
              '1',
              '\\',
              testData.updated1XXValue,
              '$e artist.',
              `$0 ${authData.hrid}`,
              '',
            );

            // Step 6. Close quickmarc, click Actions > Edit - verify FOLIO fields not cleared
            QuickMarcEditor.closeWithoutSaving();
            InventoryInstance.editInstance();
            InstanceRecordEdit.waitLoading();
            InstanceRecordEdit.verifyDiscoverySuppressCheckbox(true);
            InstanceRecordEdit.verifyStaffSuppressCheckbox(true);
            InstanceRecordEdit.verifyPreviouslyHeldCheckbox(true);
            InstanceRecordEdit.verifyCatalogedDateField(testData.catalogedDate);
            InstanceRecordEdit.verifyInstanceStatusTermSelected(testData.instanceStatusTerm);
            InstanceRecordEdit.verifyStatisticalCodeSelected(testData.sharedStatisticalCode);
            InstanceRecordEdit.verifyAdministrativeNote(testData.administrativeNote);
            InstanceRecordEdit.verifyNatureOfContentSelected(testData.sharedNatureOfContent);
            InstanceRecordEdit.verifyParentInstance(
              testData.sharedParentInstanceTitle,
              sharedParentInstanceHrid,
            );
            InstanceRecordEdit.verifyChildInstance(
              testData.sharedChildInstanceTitle,
              sharedChildInstanceHrid,
            );
            InstanceRecordEdit.close();

            // Step 7. Switch active affiliation to Member tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();

            // Step 8. Open Local linked Instance - verify FOLIO fields and tags not cleared
            InventorySearchAndFilter.clearDefaultFilter(testData.heldByAccordionName);
            InventoryInstances.searchByTitle(localInstanceId);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();

            InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
            InstanceRecordView.verifyInstanceIsMarkedAsPreviouslyHeld();
            InstanceRecordView.verifyCatalogedDate(testData.catalogedDate);
            InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
            InstanceRecordView.verifyStatisticalCode(testData.localStatisticalCode);
            InstanceRecordView.verifyAdministrativeNote(testData.administrativeNote);
            InstanceRecordView.verifyNatureOfContent(testData.localNatureOfContent);
            InstanceRecordView.verifyParentInstanceTitle(testData.localParentInstanceTitle);
            InstanceRecordView.verifyChildInstanceTitle(testData.localChildInstanceTitle);
            InventoryInstance.openTagsPane();
            InventoryInstance.checkTagSelectedInDropdown(testData.tagName);

            // Step 9. Click Actions > Edit MARC bibliographic record - verify linked field is updated
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              linkingTagAndValue.bibFieldIndex,
              linkingTagAndValue.tag,
              '1',
              '\\',
              testData.updated1XXValue,
              '$e artist.',
              `$0 ${authData.hrid}`,
              '',
            );

            // Step 10. Close quickmarc, click Actions > Edit - verify FOLIO fields not cleared
            QuickMarcEditor.closeWithoutSaving();
            InventoryInstance.editInstance();
            InstanceRecordEdit.waitLoading();
            InstanceRecordEdit.verifyDiscoverySuppressCheckbox(true);
            InstanceRecordEdit.verifyStaffSuppressCheckbox(true);
            InstanceRecordEdit.verifyPreviouslyHeldCheckbox(true);
            InstanceRecordEdit.verifyCatalogedDateField(testData.catalogedDate);
            InstanceRecordEdit.verifyInstanceStatusTermSelected(testData.instanceStatusTerm);
            InstanceRecordEdit.verifyStatisticalCodeSelected(testData.localStatisticalCode);
            InstanceRecordEdit.verifyAdministrativeNote(testData.administrativeNote);
            InstanceRecordEdit.verifyNatureOfContentSelected(testData.localNatureOfContent);
            InstanceRecordEdit.verifyParentInstance(
              testData.localParentInstanceTitle,
              localParentInstanceHrid,
            );
            InstanceRecordEdit.verifyChildInstance(
              testData.localChildInstanceTitle,
              localChildInstanceHrid,
            );
            InstanceRecordEdit.close();
          },
        );
      });
    });
  });
});
