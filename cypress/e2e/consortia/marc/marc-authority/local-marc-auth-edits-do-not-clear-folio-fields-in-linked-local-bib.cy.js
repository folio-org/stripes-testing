import { APPLICATION_NAMES, INSTANCE_STATUS_TERM_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InstanceStatusTypes from '../../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NatureOfContent from '../../../../support/fragments/settings/inventory/instances/natureOfContent';
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
          localInstanceTitle: `AT_C1307994_LocalBib_${randomPostfix}`,
          localParentInstanceTitle: `AT_C1307994_LocalParent_${randomPostfix}`,
          localChildInstanceTitle: `AT_C1307994_LocalChild_${randomPostfix}`,
          catalogedDate: DateTools.getFormattedDate({ date: new Date() }),
          instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.CATALOGED,
          statisticalCodeType: 'ARL (Collection stats)',
          statisticalCode: null,
          administrativeNote: `C1307994 admin note ${randomPostfix}`,
          natureOfContent: null,
          tagName: 'c1307994',
          searchOption: 'Keyword',
        };

        const authData = {
          prefix: randomLetters,
          startWithNumber: `C1307994${randomDigits}`,
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
        let localInstanceId;
        let localParentInstanceId;
        let localParentInstanceHrid;
        let localChildInstanceId;
        let localChildInstanceHrid;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeading);

          // Create Local MARC Authority in Member tenant
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
              cy.getInstanceById(localInstanceId).then((instanceData) => {
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
                                  superInstanceId: localParentInstanceId,
                                  instanceRelationshipTypeId: relationshipTypeId,
                                },
                              ],
                              childInstances: [
                                {
                                  subInstanceId: localChildInstanceId,
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
            });

          // Create user with permissions in Member tenant only
          cy.then(() => {
            cy.resetTenant();
            cy.createTempUser([]).then((createdUserProperties) => {
              testData.userProperties = createdUserProperties;

              cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.enableStaffSuppressFacet.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              ]);

              cy.login(testData.userProperties.username, testData.userProperties.password);
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          cy.setTenant(Affiliations.College);
          MarcAuthority.deleteViaAPI(authorityId, true);
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
          'C1307994 Verify that Local MARC authority record edits do not clear FOLIO fields in linked Local MARC bib records (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C1307994'] },
          () => {
            // Step 1. Open Local MARC authority record - click Actions > Edit
            MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading);
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.edit();

            // Step 2. Update $a subfield of 1XX field
            cy.wait(2000);
            QuickMarcEditor.updateExistingField(testData.tag100, testData.updated1XXValue);

            // Step 3. Save & close, confirm in modal
            QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
            QuickMarcEditor.confirmUpdateLinkedBibs(1);

            // Step 4. Go to Inventory and open linked Local Instance - verify FOLIO fields and tags not cleared
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(localInstanceId);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();

            InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
            InstanceRecordView.verifyInstanceIsMarkedAsPreviouslyHeld();
            InstanceRecordView.verifyCatalogedDate(testData.catalogedDate);
            InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
            InstanceRecordView.verifyStatisticalCode(testData.statisticalCode);
            InstanceRecordView.verifyAdministrativeNote(testData.administrativeNote);
            InstanceRecordView.verifyNatureOfContent(testData.natureOfContent);
            InstanceRecordView.verifyParentInstanceTitle(testData.localParentInstanceTitle);
            InstanceRecordView.verifyChildInstanceTitle(testData.localChildInstanceTitle);
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
            InstanceRecordEdit.verifyStatisticalCodeSelected(testData.statisticalCode);
            InstanceRecordEdit.verifyAdministrativeNote(testData.administrativeNote);
            InstanceRecordEdit.verifyNatureOfContentSelected(testData.natureOfContent);
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
