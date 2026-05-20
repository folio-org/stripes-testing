import Permissions from '../../../support/dictionary/permissions';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import { Lists } from '../../../support/fragments/lists/lists';
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import { generateDatePickerCustomFieldData } from '../../../support/utils/customFields';
import { poll } from '../../../support/utils/polling';
import { getCurrentTimestamp, getTestEntityValue } from '../../../support/utils/stringTools';
import {
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
} from '../../../../interactors';

describe('Lists', () => {
  describe('Query Builder UI', () => {
    let userData = {};
    let listName;

    const buildQueryModal = Pane('Build query');
    const previewTable = buildQueryModal.find(MultiColumnList({ id: 'results-viewer-table' }));

    const addQueryBuilderCapabilitySets = (capabilitySets) => {
      const capabilitySetIds = [];

      cy.then(() => {
        capabilitySets.forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi({
            type: capabilitySet.type,
            resource: capabilitySet.resource,
            action: capabilitySet.action,
          }).then((capabilitySetId) => capabilitySetIds.push(capabilitySetId));
        });
      }).then(() => {
        if (capabilitySetIds.length) {
          cy.addCapabilitySetsToNewUserApi(userData.userId, capabilitySetIds, true);
        }
      });
    };

    const createQueryBuilderUser = (permissions, capabilitySets = []) => {
      cy.getAdminToken()
        .then(() => cy.createTempUser(permissions))
        .then((userProperties) => {
          userData = userProperties;
          if (Cypress.env('eureka')) {
            addQueryBuilderCapabilitySets([CapabilitySets.moduleListsManage, ...capabilitySets]);
          }
        });
    };

    const deleteQueryBuilderUser = () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      userData = {};
    };

    const deleteTestList = (
      getToken = () => cy.getUserToken(userData.username, userData.password),
    ) => {
      if (listName) {
        getToken().then(() => {
          Lists.deleteListByNameViaApi(listName, true);
          cy.getAdminToken();
          listName = undefined;
        });
      }
    };

    const openQueryBuilder = (recordType, description) => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.openNewListPane();
      Lists.setName(listName);
      if (description) {
        Lists.setDescription(description);
      }
      Lists.selectRecordType(recordType);
      Lists.buildQuery();
    };

    const waitForCustomFieldToBeQueryable = (recordType, fieldLabel) => {
      return Lists.getEntityTypeIdByNameViaApi(recordType).then((entityTypeId) => {
        return poll(
          () => Lists.getEntityTypeByIdViaApi(entityTypeId, { failOnStatusCode: false }),
          ({ body }) => {
            return body.columns?.some(
              ({ labelAlias, queryable }) => labelAlias === fieldLabel && queryable,
            );
          },
          {
            timeout: 360000,
            delay: 15000,
            errorMessage: `"${fieldLabel}" custom field did not become queryable for ${recordType}`,
          },
        );
      });
    };

    const verifyQueryBuilder = (
      field,
      operator,
      filedType,
      value,
      query,
      locator,
      valueInColumn,
    ) => {
      QueryModal.selectField(field);
      QueryModal.selectOperator(operator);
      QueryModal.populateFiled(filedType, value);
      QueryModal.testQuery();
      cy.wait(2000); // wait for query to process
      Lists.verifyQueryHeader(field);
      Lists.verifyQueryValue(value, operator, locator, valueInColumn);
      Lists.verifyPreviewOfRecordsMatched();
      QueryModal.clickRunQueryAndSave();
      QueryModal.verifyClosed();
      Lists.waitForCompilingToComplete(3000);
      Lists.verifyQuery(query);
      Lists.verifyQueryHeader(field);
      Lists.verifyQueryValue(value, operator, locator, valueInColumn);
      Lists.closeListDetailsPane();
    };

    describe('Organizations', () => {
      const recordType = 'Organizations';
      before('Create test user', () => {
        createQueryBuilderUser([
          Permissions.listsEdit.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]);
      });

      after('Delete test user', () => {
        deleteQueryBuilderUser();
      });

      afterEach('Delete test list', () => {
        deleteTestList();
      });

      it(
        'C451507 Search for "organizations" in the query builder using "Status" field (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451507'] },
        () => {
          listName = getTestEntityValue('C451507_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'Organization — Status',
            QUERY_OPERATIONS.EQUAL,
            'select',
            'Active',
            'organization.status == Active',
            'list-column-organization.status',
          );
        },
      );

      it(
        'C613149 Query builder value dropdown options are filtered case-insensitively by search text (corsair)',
        { tags: ['extendedPath', 'corsair', 'C613149'] },
        () => {
          listName = getTestEntityValue('C613149_List');
          openQueryBuilder(recordType);

          QueryModal.selectField('Organization — Status');
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyOptionsInValueSelect(['Active', 'Inactive', 'Pending']);
          QueryModal.verifyFilteredOptionsInValueSelect('pEn', ['Pending']);
        },
      );
    });

    describe('Purchase order lines', () => {
      const recordType = 'Purchase order lines';

      before('Create test user', () => {
        createQueryBuilderUser([
          Permissions.listsAll.gui,
          Permissions.usersViewRequests.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.inventoryAll.gui,
          Permissions.loansAll.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]);
      });

      after('Delete test user', () => {
        deleteQueryBuilderUser();
      });

      afterEach('Delete test list', () => {
        deleteTestList();
      });

      it(
        'C451553 Verify that grouped fields display within a list row for "POL — Fund distribution" column (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451553'] },
        () => {
          listName = getTestEntityValue('C451553_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'POL — UUID',
            QUERY_OPERATIONS.NOT_IN,
            'input',
            'test',
            'pol.id not in test',
            'list-column-pol.id',
          );
        },
      );
    });

    describe('Users', () => {
      const recordType = 'Users';

      before('Create test user', () => {
        createQueryBuilderUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui]);
      });

      after('Delete test user', () => {
        deleteQueryBuilderUser();
      });

      afterEach('Delete test list', () => {
        deleteTestList();
      });

      it(
        'C451548 Verify the operator null/empty with "True" value (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451548'] },
        () => {
          listName = getTestEntityValue('C451548_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'User — Middle name',
            QUERY_OPERATIONS.IS_NULL,
            'select',
            'True',
            'users.middle_name is null/empty true',
            'list-column-users.middle_name',
            '',
          );
        },
      );
    });

    describe('Users custom fields', () => {
      const recordType = 'Users';
      const testNumber = 'C831970';
      const today = new Date();
      const customFieldValue = DateTools.getFormattedDate({ date: today });
      const customFieldValueForQuery = DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY');
      const testData = {
        customField: generateDatePickerCustomFieldData({
          testNumber,
          data: {
            name: `AT_C831970_Corsair_date_${getCurrentTimestamp()}`,
          },
        }),
      };

      before('Create date picker custom field and test user', () => {
        cy.getAdminToken()
          .then(() => cy.createCustomFieldsViaApi([testData.customField]))
          .then(([createdCustomField]) => {
            testData.createdCustomField = createdCustomField;
            testData.customField = createdCustomField;

            return cy.createTempUserParameterized(
              {
                ...Users.generateUserModel(),
                customFields: {
                  [createdCustomField.refId]: customFieldValue,
                },
              },
              [],
            );
          })
          .then((userProperties) => {
            userData = userProperties;
          })
          .then(() => {
            return waitForCustomFieldToBeQueryable(
              recordType,
              `User — ${testData.customField.name}`,
            );
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        const customFieldIds = testData.createdCustomField ? [testData.createdCustomField.id] : [];
        if (customFieldIds.length) {
          cy.deleteCustomFieldsViaApi({ ids: customFieldIds });
        }
        Users.deleteViaApi(userData.userId);
        userData = {};
      });

      afterEach('Delete test list', () => {
        deleteTestList(cy.getAdminToken);
      });

      it(
        'C831970 Verify that the custom field with a type Date picker is queryable (corsair)',
        { tags: ['criticalPath', 'corsair', 'C831970'] },
        () => {
          const customFieldLabel = `User — ${testData.customField.name}`;

          listName = getTestEntityValue('C831970_List');
          cy.loginAsAdmin({
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(recordType);
          Lists.verifySelectedOptionsInRecordTypeDropdown(recordType);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          QueryModal.selectField(customFieldLabel);
          QueryModal.verifySelectedField(customFieldLabel);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyValueColumn();
          QueryModal.pickDate(customFieldValueForQuery);
          QueryModal.verifyTextFieldValue(customFieldValueForQuery);
          QueryModal.testQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyRecordWithContent(userData.username);
        },
      );
    });

    describe('Instances', () => {
      const recordType = 'Instances';
      const resourceTypeColumn = 'Instance — Resource type';
      const testData = {
        instanceTitle: getTestEntityValue('C_lists_query_builder_classification_instance'),
        deletedInstanceTitle: getTestEntityValue('C808493_Instance'),
        deletedInstanceTypeName: 'still image',
        uuidInstanceTitles: [
          getTestEntityValue('C446019_Instance_1'),
          getTestEntityValue('C446019_Instance_2'),
        ],
        instanceIds: [],
        instanceTitleWithEnglishLanguage: getTestEntityValue(
          'C_lists_query_builder_english_language_instance',
        ),
        localizedEnglishLanguageName: 'Englisch',
        germanTenantLocale: 'de-DE',
        classificationNumber: 'BJ1533.C4',
        classificationIdentifierTypeName: getTestEntityValue(
          'C_lists_query_builder_classification_type',
        ),
      };

      before('Create test user and instance', () => {
        cy.getAdminToken();
        ClassificationIdentifierTypes.createViaApi({
          name: testData.classificationIdentifierTypeName,
          source: 'local',
        }).then((response) => {
          testData.classificationIdentifierTypeId = response.body.id;
        });
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.instanceTitle,
              languages: ['eng'],
              classifications: [
                {
                  classificationNumber: testData.classificationNumber,
                  classificationTypeId: testData.classificationIdentifierTypeId,
                },
              ],
            },
          }).then(({ instanceId }) => {
            testData.instanceId = instanceId;
            testData.instanceIds.push(instanceId);
          });
          testData.uuidInstanceTitles.forEach((title) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title,
              },
            }).then(({ instanceId }) => {
              testData.instanceIds.push(instanceId);
            });
          });
        });
        createQueryBuilderUser(
          [
            Permissions.listsAll.gui,
            Permissions.inventoryAll.gui,
            Permissions.settingsTenantEditLanguageLocationAndCurrency.gui,
          ],
          [CapabilitySets.uiInventory],
        );
      });

      after('Delete test user and instance', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        testData.instanceIds
          .filter((instanceId) => instanceId !== testData.instanceId)
          .forEach((instanceId) => {
            InventoryInstance.deleteInstanceViaApi(instanceId);
          });
        if (testData.instanceIdWithEnglishLanguage) {
          InventoryInstance.deleteInstanceViaApi(testData.instanceIdWithEnglishLanguage);
        }
        ClassificationIdentifierTypes.deleteViaApi(testData.classificationIdentifierTypeId);
      });

      afterEach('Delete test list', () => {
        deleteTestList();
        if (testData.originalTenantLocale) {
          cy.getAdminToken();
          cy.setTenantLocaleApi(testData.originalTenantLocale);
          testData.originalTenantLocale = undefined;
        }
        if (testData.deletedInstanceId) {
          cy.getAdminToken();
          InventoryInstance.deleteInstanceViaApi(testData.deletedInstanceId);
          testData.deletedInstanceId = undefined;
        }
      });

      const createDeletedInstance = () => {
        return cy.getAdminToken().then(() => {
          return cy
            .getInstanceTypes({
              limit: 1,
              query: `name=="${testData.deletedInstanceTypeName}"`,
            })
            .then((instanceTypes) => {
              return InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instanceTypes[0].id,
                  title: testData.deletedInstanceTitle,
                },
              }).then(({ instanceId }) => {
                testData.deletedInstanceId = instanceId;
                InstanceRecordView.markAsDeletedViaApi(instanceId);
              });
            });
        });
      };

      const verifyPreviewHridIsPopulated = () => {
        cy.then(() => previewTable
          .find(MultiColumnListRow({ indexRow: 'row-0' }))
          .find(MultiColumnListCell({ column: instanceFieldValues.instanceHrid }))
          .innerText()).then((cellText) => {
          expect(cellText.trim()).to.not.equal('');
        });
      };

      it(
        'C451549 Verify the operator null/empty with "False" value (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451549'] },
        () => {
          listName = getTestEntityValue('C451549_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'Instance — Suppress from discovery',
            QUERY_OPERATIONS.IS_NULL,
            'select',
            'False',
            'instance.discovery_suppress is null/empty false',
            'list-column-instance.discovery_suppress',
            'False',
          );
        },
      );

      it(
        'C1259783 Verify that no undefined values are displayed when editing a query (corsair)',
        { tags: ['smoke', 'corsair', 'C1259783'] },
        () => {
          const language = 'English';
          const recordAmount = 1;
          const expectedLanguageQuery = `(instance.languages in [${language}])`;
          const expectedQuery = `${expectedLanguageQuery} AND (instance.title == ${testData.instanceTitle})`;

          listName = getTestEntityValue('C1259783_List');
          openQueryBuilder(recordType, listName);

          QueryModal.selectField(instanceFieldValues.languages);
          QueryModal.verifySelectedField(instanceFieldValues.languages);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(language);
          QueryModal.verifySelectedValue(language);
          QueryModal.verifyQueryAreaContent(`(instance.languages == ${language})`);

          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedMultiselectValue(language);
          QueryModal.verifyQueryAreaContent(expectedLanguageQuery);
          QueryModal.verifyQueryAreaDoesNotContain('undefined');

          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.verifySelectedField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(testData.instanceTitle, 1);
          QueryModal.verifyTextFieldValue(testData.instanceTitle, 1);
          QueryModal.verifyQueryAreaContent(expectedQuery);
          QueryModal.verifyQueryAreaDoesNotContain('undefined');

          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(recordAmount);
          QueryModal.verifyRecordWithContent(testData.instanceTitle);
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
          Lists.waitForCompilingAnimationToDisappear();
          Lists.verifyRefreshCompleteCallout(recordAmount);
          Lists.viewUpdatedList();
          Lists.verifySingleRecordNumber();
          Lists.verifyRecordWithContent(testData.instanceTitle);

          Lists.openActions();
          Lists.editList();
          Lists.editQuery();
          QueryModal.verifySelectedField(instanceFieldValues.languages);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifySelectedMultiselectValue(language);
          QueryModal.verifySelectedField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifyTextFieldValue(testData.instanceTitle, 1);
          QueryModal.verifyQueryAreaContent(expectedQuery);
          QueryModal.testQueryDisabled(false);
          QueryModal.verifyRowDoesNotContain('eng');
          QueryModal.verifyQueryAreaDoesNotContain('undefined');
        },
      );

      it(
        'C808493 Verify query with "Instance — Flag for deletion" returns records after opening edit query (corsair)',
        { tags: ['criticalPath', 'corsair', 'C808493'] },
        () => {
          const recordAmount = 1;
          const verifyDeletedInstancePreview = () => {
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfMatchedRecords(recordAmount);
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.deletedInstanceTitle,
              instanceFieldValues.flagForDeletion,
              'True',
            );
            verifyPreviewHridIsPopulated();
            QueryModal.verifyMatchedRecordsByIdentifier(
              testData.deletedInstanceTitle,
              resourceTypeColumn,
              testData.deletedInstanceTypeName,
            );
          };

          listName = getTestEntityValue('C808493_List');
          createDeletedInstance();

          openQueryBuilder(recordType, listName);

          QueryModal.selectField(instanceFieldValues.instanceResourceTitle);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.deletedInstanceTitle);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.flagForDeletion, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect('True', 1);

          QueryModal.clickTestQuery();
          verifyDeletedInstancePreview();
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
          Lists.waitForCompilingAnimationToDisappear();
          Lists.verifyRefreshCompleteCallout(recordAmount);
          Lists.viewUpdatedList();
          Lists.verifySingleRecordNumber();
          Lists.verifyRecordWithContent(testData.deletedInstanceTitle);
          Lists.openActions();
          Lists.editList();
          Lists.editQuery();
          QueryModal.verifySelectedField(instanceFieldValues.instanceResourceTitle);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyTextFieldValue(testData.deletedInstanceTitle);
          QueryModal.verifySelectedField(instanceFieldValues.flagForDeletion, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifySelectedValue('True', 1);
          QueryModal.testQueryDisabled(false);

          QueryModal.clickTestQuery();
          verifyDeletedInstancePreview();
        },
      );

      it(
        'C446019 The IN operator is rendered correctly in the query builder when editing existing queries (corsair)',
        { tags: ['criticalPath', 'corsair', 'C446019'] },
        () => {
          const recordAmount = 3;
          const instanceIds = testData.instanceIds;
          const value = instanceIds.join(',');
          const formattedValue = instanceIds.join(', ');
          const expectedQuery = `(instance.id in (${formattedValue}))`;

          listName = getTestEntityValue('C446019_List');
          openQueryBuilder(recordType);

          QueryModal.selectField(instanceFieldValues.instanceId);
          QueryModal.verifySelectedField(instanceFieldValues.instanceId);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(value);
          QueryModal.verifyTextFieldValue(value);
          QueryModal.verifyQueryAreaContent(expectedQuery);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled();

          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(recordAmount);
          instanceIds.forEach((instanceId) => {
            QueryModal.verifyRecordWithContent(instanceId);
          });

          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
          Lists.waitForCompilingAnimationToDisappear();
          Lists.verifyRefreshCompleteCallout(recordAmount);
          Lists.viewUpdatedList();
          Lists.verifyRecordsNumber(recordAmount);
          instanceIds.forEach((instanceId) => {
            Lists.verifyRecordWithContent(instanceId);
          });

          Lists.openActions();
          Lists.editList();
          Lists.editQuery();
          QueryModal.verifySelectedField(instanceFieldValues.instanceId);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN);
          QueryModal.verifyTextFieldValue(value);
          QueryModal.verifyQueryAreaDoesNotContain('undefined');
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled();

          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(recordAmount);
          instanceIds.forEach((instanceId) => {
            QueryModal.verifyRecordWithContent(instanceId);
          });
        },
      );

      it(
        'C613147 Search instances in the query builder by localized language name (corsair)',
        { tags: ['criticalPath', 'corsair', 'C613147'] },
        () => {
          listName = getTestEntityValue('C_lists_query_builder_localized_language_list');

          cy.getAdminToken();
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: testData.instanceTitleWithEnglishLanguage,
                languages: ['eng'],
              },
            }).then(({ instanceId }) => {
              testData.instanceIdWithEnglishLanguage = instanceId;
            });
          });
          cy.getTenantLocaleApi().then((locale) => {
            testData.originalTenantLocale = locale;
          });

          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          cy.getUserToken(userData.username, userData.password);
          cy.then(() => {
            cy.setTenantLocaleApi({
              ...testData.originalTenantLocale,
              locale: testData.germanTenantLocale,
            });
          });
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(recordType);
          Lists.buildQuery();

          QueryModal.typeInAndSelectField(instanceFieldValues.languages);
          QueryModal.verifySelectedField(instanceFieldValues.languages);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(testData.localizedEnglishLanguageName);
          QueryModal.addNewRow();
          QueryModal.typeInAndSelectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInValueTextfield(testData.instanceTitleWithEnglishLanguage, 1);
          QueryModal.testQuery();
          Lists.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          cy.then(() => previewTable
            .find(MultiColumnListRow({ indexRow: 'row-0' }))
            .find(MultiColumnListCell({ column: instanceFieldValues.languages }))
            .innerText()).then((cellText) => {
            expect(cellText.trim()).to.equal(testData.localizedEnglishLanguageName);
          });
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.instanceTitleWithEnglishLanguage,
            instanceFieldValues.languages,
            testData.localizedEnglishLanguageName,
          );
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.waitForCompilingToComplete(3000);
          Lists.verifyQueryHeader(instanceFieldValues.languages);
          Lists.verifyQueryValue(
            testData.localizedEnglishLanguageName,
            QUERY_OPERATIONS.EQUAL,
            'list-column-instance.languages',
          );
          Lists.closeListDetailsPane();
        },
      );

      it(
        'Search instances in the query builder by classification identifier type (corsair)',
        { tags: ['criticalPath', 'corsair'] },
        () => {
          listName = getTestEntityValue('C_lists_query_builder_classification_list');
          openQueryBuilder(recordType);

          QueryModal.typeInAndSelectField(
            instanceFieldValues.classificationsClassificationIdentifierType,
          );
          QueryModal.verifySelectedField(
            instanceFieldValues.classificationsClassificationIdentifierType,
          );
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueMultiselect(testData.classificationIdentifierTypeName);
          QueryModal.verifySelectedMultiselectValue(testData.classificationIdentifierTypeName);
          QueryModal.testQuery();
          Lists.verifyPreviewOfRecordsMatched();
          cy.contains(testData.instanceTitle).should('be.visible');
          QueryModal.verifyQueryAreaContent(
            `(instance.classifications[*]->type_name in [${testData.classificationIdentifierTypeName}])`,
          );
        },
      );
    });
  });
});
