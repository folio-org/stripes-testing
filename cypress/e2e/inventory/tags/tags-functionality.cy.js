import uuid from 'uuid';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  INSTANCE_SOURCE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TagsGeneral from '../../../support/fragments/settings/tags/tags-general';

import Permissions from '../../../support/dictionary/permissions';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/generateTextCode';
import Helper from '../../../support/fragments/finance/financeHelper';
import Invoices from '../../../support/fragments/invoices/invoices';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

describe('Inventory', () => {
  describe('Tags', () => {
    let userData;
    const tagC358961 = `tagc358961${uuid()}`;
    const tagC358962 = `tagc358962${uuid()}`;
    const tagsC367962 = [...Array(5)].map(() => `tag${getRandomStringCode(5)}`.toLowerCase());
    const testData = {
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      fileName: `testFile.${getRandomPostfix()}.mrc`,
    };

    before('Preconditions', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.userServicePoint);
      cy.createTempUser([
        Permissions.uiUserCanEnableDisableTags.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiTagsPermissionAll.gui,
      ])
        .then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id,
          );
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
        });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C358962 Assign tags to an Instance record when unlinked preceding/succeeding titles present 2: Source = FOLIO (volaris)',
      { tags: ['extendedPath', 'volaris', 'C358962'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry('marcFileForC358962.mrc', testData.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search('Default - Create instance and SRS MARC Bib');
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.fileName);
        Logs.checkJobStatus(testData.fileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.fileName);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        InventorySearchAndFilter.addTag(tagC358962);
        InteractorsTools.checkCalloutMessage('New tag created');
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.switchToInstance();
        InventorySearchAndFilter.filterByTag(tagC358962);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        InventoryInstance.deleteTag(tagC358962);
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.verifyTagIsAbsent(tagC358962);
      },
    );

    it(
      'C358961 Assign tags to an Instance record when unlinked preceding/succeeding titles present 3: quickMARC (volaris)',
      { tags: ['extendedPathFlaky', 'volaris', 'C358961'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: SettingsMenu.tagsGeneralPath,
          waiter: TagsGeneral.waitLoading,
        });
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.bySource(ACCEPTED_DATA_TYPE_NAMES.MARC);
        InventoryInstances.selectInstance();
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventoryInstance.viewSource();
        InventoryViewSource.notContains('780\t');
        InventoryViewSource.notContains('785\t');
        InventoryViewSource.close();
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.addEmptyFields(5);
        QuickMarcEditor.addValuesToExistingField(5, '780', '$t preceding $x 1234-1234', '0', '0');
        cy.wait(1000);
        QuickMarcEditor.addEmptyFields(6);
        cy.wait(1000);
        QuickMarcEditor.addValuesToExistingField(6, '785', '$t succeeding $x 1234-1234', '0', '0');
        cy.wait(1000);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        InventorySearchAndFilter.addTag(tagC358961);
        InteractorsTools.checkCalloutMessage('New tag created');
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.switchToInstance();
        InventorySearchAndFilter.filterByTag(tagC358961);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        InventoryInstance.deleteTag(tagC358961);
        InventorySearchAndFilter.closeTagsPane();
        InventorySearchAndFilter.verifyTagCount();
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.verifyTagIsAbsent(tagC358961);

        // Cleanup — remove fields 780 and 785
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.bySource(ACCEPTED_DATA_TYPE_NAMES.MARC);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.deleteFieldByTagAndCheck('780');
        QuickMarcEditor.deleteFieldByTagAndCheck('785');
        QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
        QuickMarcEditor.checkAfterSaveAndClose();
      },
    );

    it(
      'C367962 Verify that user can add more than 1 tag to "Holdings" record with source "MARC" (volaris)',
      { tags: ['extendedPath', 'volaris', 'C367962'] },
      () => {
        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventorySearchAndFilter.byKeywords('Houston/Texas oil directory');
        InventoryInstances.selectInstance();
        InventorySteps.addMarcHoldingRecord();

        cy.login(userData.username, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.bySource(ACCEPTED_DATA_TYPE_NAMES.MARC);
        InventorySearchAndFilter.byKeywords('Houston/Texas oil directory');
        InventoryInstances.selectInstance();
        InventoryInstance.openHoldingView();

        HoldingsRecordEdit.openTags();
        cy.wrap(tagsC367962).each((tag) => {
          cy.wait(500);
          HoldingsRecordEdit.addTag(tag);
        });

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.waitContentLoading();

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords('Houston/Texas oil directory');
        InventoryInstances.selectInstance();
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        cy.wrap(tagsC367962).each((tag) => {
          cy.wait(2000);
          JobProfileView.removeTag(tag);
        });
      },
    );
  });
});

describe('Inventory', () => {
  describe('Tags', () => {
    let userData;
    const patronGroup = {
      name: getTestEntityValue('groupTags'),
    };
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };

    before('Preconditions', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.createViaApi(testData.servicePoint);
          testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
          Location.createViaApi(testData.defaultLocation).then((location) => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstances,
              location,
            });
          });
        })
        .then(() => {
          PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
            patronGroup.id = patronGroupResponse;
          });
          cy.createTempUser(
            [Permissions.uiTagsPermissionAll.gui, Permissions.inventoryAll.gui],
            patronGroup.name,
          ).then((userProperties) => {
            userData = userProperties;
            UserEdit.addServicePointViaApi(
              testData.servicePoint.id,
              userData.userId,
              testData.servicePoint.id,
            );
          });
        });
    });

    beforeEach('Login', () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(userData.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        testData.folioInstances[0].barcodes[0],
      );
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
    });

    it(
      'C196770 Assign tags to a Holdings record (volaris)',
      { tags: ['extendedPath', 'volaris', 'C196770', 'eurekaPhase1'] },
      () => {
        const tagName = `tag${getRandomStringCode(5)}`.toLowerCase();
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(testData.folioInstances[0].instanceTitle);
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        HoldingsRecordEdit.addTag(tagName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventoryInstance.waitInventoryLoading();
        InventorySearchAndFilter.filterHoldingsByTag(tagName);
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        JobProfileView.removeTag(tagName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.verifyTagIsAbsent(tagName);
      },
    );

    it(
      'C367961 Verify that user can add more than 1 tag to "Holdings" record with source "Folio" (volaris)',
      { tags: ['extendedPath', 'volaris', 'C367961', 'eurekaPhase1'] },
      () => {
        const tags = [...Array(5)].map(() => `tag${getRandomStringCode(5)}`.toLowerCase());
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(testData.folioInstances[0].instanceTitle);
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        cy.wrap(tags).each((tag) => {
          cy.wait(500);
          HoldingsRecordEdit.addTag(tag);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(testData.folioInstances[0].instanceTitle);
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        cy.wrap(tags).each((tag) => {
          cy.wait(1000);
          JobProfileView.removeTag(tag);
        });
      },
    );

    it(
      'C196771 Assign tags to an Item record (volaris)',
      { tags: ['extendedPath', 'volaris', 'C196771', 'eurekaPhase1'] },
      () => {
        const tagName = `tag${getRandomStringCode(5)}`.toLowerCase();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(
          'Barcode',
          testData.folioInstances[0].barcodes[0],
        );
        HoldingsRecordEdit.openTags();
        HoldingsRecordEdit.addTag(tagName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventoryInstance.waitInventoryLoading();
        InventorySearchAndFilter.filterItemsByTag(tagName);
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(testData.folioInstances[0].barcodes[0]);
        // Wait for the item data to load instead of using cached data.
        cy.wait(1000);
        JobProfileView.removeTag(tagName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.verifyTagIsAbsent(tagName);
      },
    );
  });
});

describe('Inventory', () => {
  describe('Tags', () => {
    const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
    const tag = {
      id: uuid(),
      description: uuid(),
      label: uuid(),
    };
    let instanceId;

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 });
          cy.getInstanceIdentifierTypes({ limit: 1 });
        })
        .then(() => {
          cy.createInstance({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: instanceTitle,
              source: INSTANCE_SOURCE_NAMES.FOLIO,
            },
          }).then((specialInstanceId) => {
            instanceId = specialInstanceId;
          });
        });

      cy.createTagApi(tag).then((tagId) => {
        tag.id = tagId;
      });

      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        cy.deleteTagApi(tag.id);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C196769 Assign tags to an Instance record (folijet)',
      { tags: ['smoke', 'folijet', 'shiftLeft', 'C196769'] },
      () => {
        InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.addTag(tag.label);
        InventoryInstances.resetAllFilters();
        InventoryInstances.searchByTag(tag.label);
        InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
        InventoryInstance.checkAddedTag(tag.label, instanceTitle);
        InventoryInstance.deleteTag(tag.label);
      },
    );

    it(
      'C358144 Assign tags to an Instance record when unlinked preceding/succeeding titles present 1: Import (volaris)',
      { tags: ['extendedPath', 'volaris', 'C358144'] },
      () => {
        InventorySearchAndFilter.verifyTagCount();
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.verifyTagIsAbsent(tag.label);
      },
    );
  });
});

describe('Inventory', () => {
  describe('Tags', () => {
    let userData;
    const patronGroup = {
      name: getTestEntityValue('groupTags'),
    };
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };

    before('Preconditions', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.createViaApi(testData.servicePoint);
          testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
          Location.createViaApi(testData.defaultLocation).then((location) => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstances,
              location,
            });
          });
        })
        .then(() => {
          PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
            patronGroup.id = patronGroupResponse;
          });
          cy.createTempUser(
            [Permissions.uiTagsPermissionAll.gui, Permissions.inventoryAll.gui],
            patronGroup.name,
          ).then((userProperties) => {
            userData = userProperties;
            UserEdit.addServicePointViaApi(
              testData.servicePoint.id,
              userData.userId,
              testData.servicePoint.id,
            );
          });
        });
    });

    beforeEach('Login', () => {
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.inventoryPath);
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(userData.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        testData.folioInstances[0].barcodes[0],
      );
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
    });

    it(
      'C343216 Filter Holdings by Tags (volaris)',
      { tags: ['extendedPath', 'volaris', 'C343216'] },
      () => {
        const tagName = `tag${getRandomStringCode(5)}`.toLowerCase();
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(testData.folioInstances[0].instanceTitle);
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        HoldingsRecordEdit.addTag(tagName);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(testData.folioInstances[0].instanceTitle);
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.filterHoldingsByTag(tagName);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );

    it(
      'C343217 Filter Items by Tags (volaris)',
      { tags: ['extendedPath', 'volaris', 'C343217'] },
      () => {
        const tagName = `tag${getRandomStringCode(5)}`.toLowerCase();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(
          'Barcode',
          testData.folioInstances[0].barcodes[0],
        );
        HoldingsRecordEdit.openTags();
        HoldingsRecordEdit.addTag(tagName);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.filterItemsByTag(tagName);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );
  });
});

describe('Inventory', () => {
  describe('Tags', () => {
    let userId;
    let instanceRecord = null;
    let testTag;
    const tagsCount = '1';

    beforeEach(() => {
      testTag = `test_tag_${uuid()}`;
      cy.getAdminToken()
        .then(() => {
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            instanceRecord = instanceData;
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiTagsPermissionAll.gui,
          ]).then(({ username, password, userId: id }) => {
            userId = id;
            cy.login(username, password, {
              path: TopMenu.inventoryPath,
              waiter: InventorySearchAndFilter.waitLoading,
            });
          });
        });
    });

    afterEach(() => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceRecord.instanceId);
      Users.deleteViaApi(userId);
    });

    it(
      'C343215 Filter instances by tags (volaris)',
      { tags: ['smoke', 'volaris', 'shiftLeft', 'C343215', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.verifyPanesExist();
        InventorySearchAndFilter.searchInstanceByTitle(instanceRecord.instanceTitle);
        InventorySearchAndFilter.verifySearchResult(instanceRecord.instanceTitle);
        InventorySearchAndFilter.selectFoundInstance(instanceRecord.instanceTitle);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        InventorySearchAndFilter.addTag(testTag);
        InventorySearchAndFilter.verifyTagCount(tagsCount);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.filterByTag(testTag);
        InventorySearchAndFilter.verifyIsFilteredByTag(instanceRecord.instanceTitle);
      },
    );
  });
});

describe('Inventory', () => {
  describe('Tags', () => {
    let userData;
    const testData = {
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      newTagsIds: [],
    };
    const instanceData = {
      title: getTestEntityValue('InstanceStaffSlips'),
    };
    const newTags = [
      'atest',
      'atag_test',
      'atag,test',
      "atag's",
      'atag50%',
      'atag^one',
      '{atag}',
      '(atags)',
      '[atags]test',
      '@atag',
      'money$atag',
      'hashtag#atag',
      'atag&tags',
      'atag+tag-tag=0',
      'atag;',
      'atag.',
      'ohatag!',
      'really?',
      '"atags"',
      'atag/nottag',
      'atag\\hmm',
      'new*atag',
    ];
    before('Preconditions', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.createViaApi(testData.userServicePoint);
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.wrap([...newTags, '\\"atags\\"', 'atag\\\\hmm']).each((tag) => {
            cy.getTagsApi({ query: `label=="${tag}"` }).then(({ body }) => {
              if (body.tags) {
                cy.deleteTagApi(body.tags[0].id);
              }
            });
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: instanceData.title,
            },
          }).then((specialInstanceIds) => {
            instanceData.instanceId = specialInstanceIds.instanceId;
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiTagsPermissionAll.gui,
          ]).then((userProperties) => {
            userData = userProperties;
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              userData.userId,
              testData.userServicePoint.id,
            );
          });
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      testData.newTagsIds.forEach((id) => {
        cy.deleteTagApi(id);
      });
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      Users.deleteViaApi(userData.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceData.instanceId);
    });

    it(
      'C380422 Find Tag with special characters using API (volaris)',
      { tags: ['extendedPath', 'volaris', 'C380422', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(instanceData.title);
        InventorySearchAndFilter.verifySearchResult(instanceData.title);
        InventorySearchAndFilter.selectFoundInstance(instanceData.title);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        newTags.forEach((tag) => {
          InventorySearchAndFilter.addTag(tag);
          InteractorsTools.checkCalloutMessage('New tag created');
          InventorySearchAndFilter.closeTagsPane();
          InventorySearchAndFilter.openTagsField();
        });

        newTags[newTags.indexOf('"atags"')] = '\\"atags\\"';
        newTags[newTags.indexOf('atag\\hmm')] = 'atag\\\\hmm';
        newTags.forEach((tag) => {
          cy.getAdminToken();
          cy.getTagsApi({ query: `label=="${tag}"` }).then(({ body }) => {
            testData.newTagsIds.push(body.tags[0].id);
          });
        });
      },
    );
  });
});

describe('Inventory', () => {
  describe('Tags (Inventory)', () => {
    let userData;
    let servicePointId;
    const patronGroup = {
      name: getTestEntityValue('groupTags'),
    };

    before('Preconditions', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
          servicePointId = servicePoint.id;
        });
        PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
          patronGroup.id = patronGroupResponse;
        });
        cy.createTempUser(
          [
            Permissions.uiUserCanEnableDisableTags.gui,
            Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
          ],
          patronGroup.name,
        ).then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.tagsGeneralPath,
            waiter: TagsGeneral.waitLoading,
          });
        });
      });
    });

    after('Deleting created entities', () => {
      // Let's enable tags settings, in case the test fails,
      // to not break other tests in the thread
      cy.visit(SettingsMenu.tagsGeneralPath);
      TagsGeneral.waitLoading();
      TagsGeneral.changeEnableTagsStatus('enable');

      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
    });

    it(
      'C397329 Verify that permission: "Settings (Tags): Can enable or disable tags for all apps" works as expected (volaris)',
      { tags: ['criticalPath', 'volaris', 'C397329'] },
      () => {
        TagsGeneral.changeEnableTagsStatus('disable');
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.waitLoading();
        Invoices.selectStatusFilter('Open');
        InvoiceView.selectFirstInvoice();
        InvoiceView.verifyTagsIsAbsent();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        TagsGeneral.waitLoading();
        TagsGeneral.changeEnableTagsStatus('enable');
        cy.visit(TopMenu.invoicesPath);
        Invoices.waitLoading();
        Invoices.selectStatusFilter('Open');
        InvoiceView.selectFirstInvoice();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
      },
    );
  });
});

describe('Inventory', () => {
  describe('Tags', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C490907_MarcInstance_${randomPostfix}`,
      tags: [],
    };
    let user;
    let instanceId;

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          // Create test tags
          for (let i = 1; i <= 5; i++) {
            const tagLabel = `at_c490907_tag${i}_${randomPostfix}`;
            cy.createTagApi({
              label: tagLabel,
              description: `Test tag ${i} for C490907`,
            }).then((tagId) => {
              testData.tags.push({
                id: tagId,
                label: tagLabel,
              });
            });
          }
        })
        .then(() => {
          // Create instance with source "MARC"
          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((createdInstanceId) => {
            instanceId = createdInstanceId;
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiTagsPermissionAll.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        testData.tags.forEach((tag) => {
          cy.deleteTagApi(tag.id);
        });
        InventoryInstance.deleteInstanceViaApi(instanceId);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C490907 Verify that user can quickly add more than 1 tag to "Instance" record with source "MARC" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C490907'] },
      () => {
        // Search for and open the instance
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventorySearchAndFilter.openTagsField();

        InventoryInstance.addMultipleTags(testData.tags.map((tag) => tag.label));

        // Verify no error messages appeared
        InteractorsTools.checkNoErrorCallouts();

        // Step 4: Close the "Tags" pane
        InventorySearchAndFilter.closeTagsPane();

        // Expected: The amount of assigned tags is displayed next to "Tags" icon
        InventorySearchAndFilter.checkTagsCounter(testData.tags.length);

        // Step 5: Click on the "Tags" icon on the top-right side of Instance pane
        InventorySearchAndFilter.openTagsField();

        // Expected: "Tags" right pane has multiselect dropdown, dropdown contains all tags assigned in step #3
        InventorySearchAndFilter.verifyTagsView();
        testData.tags.forEach((tag) => {
          InventoryInstance.checkTagSelectedInDropdown(tag.label);
        });

        // Step 6: Quickly delete 2-3 tags by clicking on the "x" icon next to each tag
        InventoryInstance.deleteMultipleTags(testData.tags.slice(0, 3).map((tag) => tag.label));

        // Verify no error messages appeared
        InteractorsTools.checkNoErrorCallouts();

        // Step 8: Quickly unselect the remaining tags by clicking on the tag row in multiselect dropdown
        InventoryInstance.deleteMultipleTags(testData.tags.slice(3).map((tag) => tag.label));

        // Verify no error messages appeared
        InteractorsTools.checkNoErrorCallouts();

        // Verify no tags are assigned
        InventorySearchAndFilter.closeTagsPane();
        InventorySearchAndFilter.checkTagsCounter(0);
      },
    );
  });
});

describe('Inventory', () => {
  describe('Tags', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C490906_FolioInstance_${randomPostfix}`,
      tags: [],
    };
    let user;
    let instanceId;

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          // Create test tags
          for (let i = 1; i <= 5; i++) {
            const tagLabel = `at_c490906_tag${i}_${randomPostfix}`;
            cy.createTagApi({
              label: tagLabel,
              description: `Test tag ${i} for C490906`,
            }).then((tagId) => {
              testData.tags.push({
                id: tagId,
                label: tagLabel,
              });
            });
          }

          cy.getInstanceTypes({ limit: 1 });
          cy.getInstanceIdentifierTypes({ limit: 1 });
        })
        .then(() => {
          // Create instance with source "Folio"
          cy.createInstance({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: testData.instanceTitle,
              source: INSTANCE_SOURCE_NAMES.FOLIO,
            },
          }).then((specialInstanceId) => {
            instanceId = specialInstanceId;
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiTagsPermissionAll.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        testData.tags.forEach((tag) => {
          cy.deleteTagApi(tag.id);
        });
        InventoryInstance.deleteInstanceViaApi(instanceId);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C490906 Verify that user can quickly add more than 1 tag to "Instance" record with source "Folio" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C490906'] },
      () => {
        // Search for and open the instance
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventorySearchAndFilter.openTagsField();

        InventoryInstance.addMultipleTags(testData.tags.map((tag) => tag.label));

        // Verify no error messages appeared
        InteractorsTools.checkNoErrorCallouts();

        // Step 4: Close the "Tags" pane
        InventorySearchAndFilter.closeTagsPane();

        // Expected: The amount of assigned tags is displayed next to "Tags" icon
        InventorySearchAndFilter.checkTagsCounter(testData.tags.length);

        // Step 5: Click on the "Tags" icon on the top-right side of Instance pane
        InventorySearchAndFilter.openTagsField();

        // Expected: "Tags" right pane has multiselect dropdown, dropdown contains all tags assigned in step #3
        InventorySearchAndFilter.verifyTagsView();
        testData.tags.forEach((tag) => {
          InventoryInstance.checkTagSelectedInDropdown(tag.label);
        });

        // Step 6: Quickly delete 2-3 tags by clicking on the "x" icon next to each tag
        InventoryInstance.deleteMultipleTags(testData.tags.slice(0, 3).map((tag) => tag.label));

        // Verify no error messages appeared
        InteractorsTools.checkNoErrorCallouts();

        // Step 8: Quickly unselect the remaining tags by clicking on the tag row in multiselect dropdown
        InventoryInstance.deleteMultipleTags(testData.tags.slice(3).map((tag) => tag.label));

        // Verify no error messages appeared
        InteractorsTools.checkNoErrorCallouts();

        // Verify no tags are assigned
        InventorySearchAndFilter.closeTagsPane();
        InventorySearchAndFilter.checkTagsCounter(0);
      },
    );
  });
});

describe('Inventory', () => {
  describe('Tags', () => {
    describe('Item tags', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        folioInstanceTitle: `AT_C490909_FolioInstance_${randomPostfix}`,
        itemBarcode: `AT_C490909_${randomPostfix}`,
        tags: [],
      };
      let user;

      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => {
            // Create test tags
            for (let i = 1; i <= 5; i++) {
              const tagLabel = `at_c490909_tag${i}_${randomPostfix}`;
              cy.createTagApi({
                label: tagLabel,
                description: `Test tag ${i} for C490909`,
              }).then((tagId) => {
                testData.tags.push({
                  id: tagId,
                  label: tagLabel,
                });
              });
            }
          })
          .then(() => {
            InventoryInstances.createInstanceViaApi(
              testData.folioInstanceTitle,
              testData.itemBarcode,
            );

            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiTagsPermissionAll.gui,
            ]).then((userProperties) => {
              user = userProperties;

              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          testData.tags.forEach((tag) => {
            cy.deleteTagApi(tag.id);
          });
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
          Users.deleteViaApi(user.userId);
        });
      });

      it(
        'C490909 Verify that user can quickly add more than 1 tag to Item record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C490909'] },
        () => {
          // 1. Go to "Inventory" app → Search by title for the Instance created as precondition
          InventorySearchAndFilter.searchInstanceByTitle(testData.folioInstanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // 2,3. Open Holdings and click on the item Barcode link to open Item details record
          InventoryInstance.openHoldingsAccordion('Holdings: ');
          InventoryInstance.openItemByBarcode(testData.itemBarcode);
          ItemRecordView.waitLoading();

          // Expand "Tags" accordion
          ItemRecordView.toggleTagsAccordion();

          // 5. Using dropdown list add 4-5 different tags to the Item record
          InventoryInstance.addMultipleTags(testData.tags.map((tag) => tag.label));

          // Verify no error messages appeared
          InteractorsTools.checkNoErrorCallouts();

          // 7. Close the "Tags" accordion
          ItemRecordView.toggleTagsAccordion(false);

          // Expected: The amount of assigned tags is displayed next to "Tags" counter
          ItemRecordView.checkTagsCounter(testData.tags.length);

          // Expand "Tags" accordion and verify tags are still present
          ItemRecordView.toggleTagsAccordion();

          // Expected: Dropdown contains all tags assigned previously
          testData.tags.forEach((tag) => {
            InventoryInstance.checkTagSelectedInDropdown(tag.label);
          });

          // 9. Quickly delete 2-3 tags by clicking on the "x" icon next to each tag
          InventoryInstance.deleteMultipleTags(testData.tags.slice(0, 3).map((tag) => tag.label));

          // Verify no error messages appeared
          InteractorsTools.checkNoErrorCallouts();

          // 10. Quickly unselect the remaining tags by clicking on the tag row in multiselect dropdown
          InventoryInstance.deleteMultipleTags(testData.tags.slice(3).map((tag) => tag.label));

          // Verify no error messages appeared
          InteractorsTools.checkNoErrorCallouts();

          // Verify no tags are assigned
          ItemRecordView.toggleTagsAccordion(false);
          ItemRecordView.checkTagsCounter(0);
        },
      );
    });
  });
});
