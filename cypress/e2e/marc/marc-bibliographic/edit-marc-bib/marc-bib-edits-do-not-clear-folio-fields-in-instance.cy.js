import { INSTANCE_STATUS_TERM_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InstanceStatusTypes from '../../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NatureOfContent from '../../../../support/fragments/settings/inventory/instances/natureOfContent';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag245: '245',
        instanceTitle: `AT_C1292051_MarcBibInstance_${randomPostfix}`,
        parentInstanceTitle: `AT_C1292051_ParentInstance_${randomPostfix}`,
        childInstanceTitle: `AT_C1292051_ChildInstance_${randomPostfix}`,
        updated245Value: `$a AT_C1292051_MarcBibInstance_${randomPostfix} Updated`,
        catalogedDate: DateTools.getFormattedDate({ date: new Date() }),
        instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.CATALOGED,
        statisticalCodeType: 'ARL (Collection stats)',
        statisticalCode: null,
        administrativeNote: `C1292051 admin note ${randomPostfix}`,
        natureOfContent: null,
        tagName: 'c1292051',
      };

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
      ];

      let instanceId;
      let parentInstanceId;
      let parentInstanceHrid;
      let childInstanceId;
      let childInstanceHrid;

      before('Create test data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.enableStaffSuppressFacet.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields)
            .then((createdInstanceId) => {
              instanceId = createdInstanceId;
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
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        cy.getInstanceById(instanceId).then((instanceData) => {
          cy.updateInstance({
            ...instanceData,
            parentInstances: [],
            childInstances: [],
          });
        });
        InventoryInstance.deleteInstanceViaApi(instanceId);
        InventoryInstance.deleteInstanceViaApi(parentInstanceId);
        InventoryInstance.deleteInstanceViaApi(childInstanceId);
      });

      it(
        'C1292051 Verify that MARC bib record edits do not clear FOLIO fields in Instance record (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire', 'C1292051'] },
        () => {
          // Preconditions: Open the linked Instance detail view via Inventory
          InventoryInstances.searchByTitle(instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // Step 1. Click Actions - Edit MARC bibliographic record
          InventoryInstance.editMarcBibliographicRecord();

          // Step 2. Update $a subfield of 245 field
          QuickMarcEditor.updateExistingField(testData.tag245, testData.updated245Value);

          // Step 3. Click Save & close - verify FOLIO fields are not cleared on Instance detail view
          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.waitLoading();

          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
          InstanceRecordView.verifyInstanceIsMarkedAsPreviouslyHeld();
          InstanceRecordView.verifyCatalogedDate(testData.catalogedDate);
          InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
          InstanceRecordView.verifyStatisticalCode(testData.statisticalCode);
          InstanceRecordView.verifyAdministrativeNote(testData.administrativeNote);
          InstanceRecordView.verifyNatureOfContent(testData.natureOfContent);
          InventoryInstance.openTagsPane();
          InventoryInstance.checkTagSelectedInDropdown(testData.tagName);

          // Step 4. Click Actions - Edit - verify FOLIO fields are not cleared on Edit pane
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.verifyDiscoverySuppressCheckbox(true);
          InstanceRecordEdit.verifyStaffSuppressCheckbox(true);
          InstanceRecordEdit.verifyPreviouslyHeldCheckbox(true);
          InstanceRecordEdit.verifyCatalogedDateField(testData.catalogedDate);
          InstanceRecordEdit.verifyParentInstance(testData.parentInstanceTitle, parentInstanceHrid);
          InstanceRecordEdit.verifyChildInstance(testData.childInstanceTitle, childInstanceHrid);
          InstanceRecordEdit.close();
        },
      );
    });
  });
});
