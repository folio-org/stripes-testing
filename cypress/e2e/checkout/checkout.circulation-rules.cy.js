import { ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Check out: Circulation rules', () => {
  const userData = {
    group: getTestEntityValue('staff$'),
    personal: {},
  };
  let patronGroupId = '';

  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: getTestEntityValue('Instance'),
  };
  let defaultLocation;
  let servicePoint;
  let loanPolicyId;
  let loanPolicy;
  let overdueFinePolicy;
  let lostItemFeePolicy;
  let requestPolicy;
  let noticePolicy;
  let originalCirculationRules;

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi();
      })
      .then((circDesk1) => {
        servicePoint = circDesk1;
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
        Location.createViaApi(defaultLocation);

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          itemData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          itemData.holdingTypeId = res[0].id;
        });

        cy.getBookMaterialType().then((materialType) => {
          itemData.materialTypeId = materialType.id;
          itemData.materialTypeName = materialType.name;
        });

        cy.getLoanTypes({ limit: 1 }).then((res) => {
          itemData.loanTypeId = res[0].id;
        });

        PatronGroups.createViaApi(userData.group).then((patronGroupResponse) => {
          patronGroupId = patronGroupResponse;
        });

        LoanPolicy.getApi({ query: 'name="One Hour" or name="one-hour"', limit: 1 }).then(
          (response) => {
            if (response.body.loanPolicies.length > 0) {
              loanPolicyId = response.body.loanPolicies[0].id;
              loanPolicy = response.body.loanPolicies[0].name;
            } else {
              // Create one-hour loan policy if it doesn't exist using LoanPolicy.createViaApi
              const loanPolicyData = {
                name: 'One Hour',
                description: 'Test one hour loan policy',
                loanable: true,
                loansPolicy: {
                  closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
                  period: {
                    duration: 1,
                    intervalId: 'Hours',
                  },
                  profileId: 'Rolling',
                },
                renewable: false,
              };
              LoanPolicy.createViaApi(loanPolicyData).then((policy) => {
                loanPolicy = policy.name;
                loanPolicyId = policy.id;
              });
            }
          },
        );
      })
      .then(() => {
        return cy.getOverdueFinePolicy({ limit: 1 }).then((policies) => {
          if (policies && policies.length > 0) {
            overdueFinePolicy = policies[0].name;
          }
        });
      })
      .then(() => {
        return cy.getLostItemFeesPolicy({ limit: 1 }).then((policies) => {
          if (policies && policies.length > 0) {
            lostItemFeePolicy = policies[0].name;
          }
        });
      })
      .then(() => {
        return cy.getRequestPolicy({ limit: 1 }).then((policies) => {
          if (policies && policies.length > 0) {
            requestPolicy = policies[0].name;
          }
        });
      })
      .then(() => {
        return cy.getNoticePolicy({ limit: 1 }).then((policies) => {
          if (policies && policies.length > 0) {
            noticePolicy = policies[0].name;
          }
        });
      })
      .then(() => {
        // Create item with book material type
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: itemData.instanceTypeId,
            title: itemData.instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: itemData.holdingTypeId,
              permanentLocationId: defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: itemData.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
            },
          ],
        });
      })
      .then(() => {
        // Create circulation rule for book material type
        cy.getCirculationRules().then((rules) => {
          originalCirculationRules = rules.rulesAsText;
          cy.log('Original circulation rules:', originalCirculationRules);

          // Add circulation rule: m book: l one-hour r allow-all n send-no-notices o overdue-fine-policy i lost-item-fee-policy
          const newRule = `m book: l ${loanPolicy} r ${requestPolicy} n ${noticePolicy} o ${overdueFinePolicy} i ${lostItemFeePolicy}`;
          const updatedRules = `${originalCirculationRules}\n${newRule}`;
          cy.log('Updated circulation rules:', updatedRules);

          return cy.updateCirculationRules({ rulesAsText: updatedRules });
        });
      });

    cy.createTempUser(
      [
        permissions.uiCirculationSettingsOtherSettings.gui,
        permissions.uiCirculationViewCreateEditDelete.gui,
        permissions.uiCirculationSettingsNoticePolicies.gui,
        permissions.uiCirculationSettingsNoticeTemplates.gui,
        permissions.uiCirculationCreateViewOverdueFinesPolicies.gui,
        permissions.uiUsersView.gui,
        permissions.uiUsersCreate.gui,
        permissions.inventoryAll.gui,
        permissions.checkoutCirculatingItems.gui,
        permissions.uiUsersViewLoans.gui,
        permissions.loansView.gui,
        permissions.loansAll.gui,
        permissions.circulationLogAll.gui,
      ],
      userData.group,
    )
      .then((userProperties) => {
        userData.personal.lastname = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);
        cy.waitForAuthRefresh(() => {
          cy.login(userData.personal.lastname, userData.password, {
            path: TopMenu.checkOutPath,
            waiter: Checkout.waitLoading,
          });
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    cy.updateCirculationRules({ rulesAsText: originalCirculationRules });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroupId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    LoanPolicy.deleteApi(loanPolicyId);
  });

  it(
    'C593 Check out: (Testing circulation rules) - perform check-out for rule with nested attributes/policies (critical) (vega)',
    { tags: ['criticalPath', 'vega', 'C593'] },
    () => {
      // Step 1: Enter user barcode and scan patron
      CheckOutActions.checkOutUser(userData.barcode, userData.personal.lastname);
      CheckOutActions.checkUserInfo(userData, userData.group);

      // Step 2: Enter item barcode and scan item
      CheckOutActions.checkOutItem(itemData.barcode);
      CheckOutActions.checkItemInfo(itemData.barcode, itemData.instanceTitle);

      // Step 3: Click on "..." button and select "Loan details"
      CheckOutActions.openLoanDetails();

      // Step 4: Verify loan policy, overdue fine policy, and lost item fee policy values
      // Check that policies match the circulation rule we created
      CheckOutActions.checkLoanPolicyInLoanDetails(loanPolicy);
      CheckOutActions.checkOverdueFinePolicyInLoanDetails(overdueFinePolicy);
      CheckOutActions.checkLostItemFeePolicyInLoanDetails(lostItemFeePolicy);
    },
  );
});
