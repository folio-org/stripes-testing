import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const MARC_CREATED_BY_FIELDS = [
  'MARC created by — Email',
  'MARC created by — Last name, first name',
  'MARC created by — Username',
];

const MARC_UPDATED_BY_FIELDS = [
  'MARC updated by — Email',
  'MARC updated by — Last name, first name',
  'MARC updated by — Username',
];

const ABSENT_MARC_BIB_FIELDS = [
  'MARC bibliographic — Record type',
  'MARC bibliographic — Updated by user UUID',
  'MARC bibliographic — Created by user UUID',
  'MARC bibliographic — Snapshot UUID',
];
const listName = `AT_C1259778_List_${getRandomPostfix()}`;

describe('Lists', () => {
  describe('SRS', () => {
    let userData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.sourceStorageRecordsCollectionGet.gui,
        Permissions.uiUsersView.gui,
        Permissions.inventoryAll.gui,
        Permissions.inventoryStorageClassificationTypesCollectionGet.gui,
        Permissions.inventoryStorageInstancesItemGet.gui,
        Permissions.inventoryStorageContributorNameTypesCollectionGet.gui,
        Permissions.inventoryStorageContributorTypesCollectionGet.gui,
        Permissions.inventoryStorageStatisticalCodesCollectionGet.gui,
        Permissions.inventoryStorageStatisticalCodeTypesCollectionGet.gui,
        Permissions.inventoryStorageInstanceFormatsCollectionGet.gui,
        Permissions.inventoryStorageNatureOfContentTermsCollectionGet.gui,
      ]).then((userProperties) => {
        userData = userProperties;
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C1259778 Entity Type - Instances with MARC bibliographic (athena)',
      { tags: ['criticalPath', 'athena', 'C1259778'] },
      () => {
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.instancesWithMarcBibliographic);
        Lists.verifySelectedOptionsInRecordTypeDropdown(
          Lists.recordTypes.instancesWithMarcBibliographic,
        );
        Lists.verifySaveButtonIsActive();
        Lists.verifyCancelButtonIsActive();

        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        QueryModal.verifyAllAvailableFieldOptions([
          instanceFieldValues.instanceHrid,
          instanceFieldValues.marcBibliographicState,
          ...MARC_CREATED_BY_FIELDS,
          ...MARC_UPDATED_BY_FIELDS,
        ]);

        ABSENT_MARC_BIB_FIELDS.forEach((fieldName) => {
          QueryModal.filterFieldSelectionList(fieldName);
          QueryModal.verifyFieldOptionAbsentInTheList();
        });
      },
    );
  });
});
