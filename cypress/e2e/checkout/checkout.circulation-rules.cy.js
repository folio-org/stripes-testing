import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
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
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Check out: Circulation rules', () => {
  const userData = {
    group: getTestEntityValue('staff$'),
    personal: {},
  };
  const BARCODE = 'barcode';
  let shouldRemoveBarcodeAfterTest = false;
  let patronGroupId = '';

  // Item A: microform material type — matches only the fallback rule
  const itemDataA = {
    barcode: generateItemBarcode(),
    instanceTitle: getTestEntityValue('InstanceMicroform'),
  };

  // Item B: book material type — matches the specific circulation rule we create
  const itemDataB = {
    barcode: generateItemBarcode(),
    instanceTitle: getTestEntityValue('InstanceBook'),
  };

  let defaultLocation;
  let servicePoint;

  // Policies read from the existing fallback circulation rule
  let fallbackLoanPolicyName;
  let fallbackOverdueFinePolicyName;
  let fallbackLostItemFeePolicyName;

  // Policies for the specific rule (m book)
  let loanPolicy;
  let overdueFinePolicy;
  let lostItemFeePolicy;
  let requestPolicy;
  let noticePolicy;

  let addedRule;

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
          servicePoint = sp;
        });
      })
      .then(() => {
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
        Location.createViaApi(defaultLocation);

        cy.getInstanceTypes({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getLoanTypes({ limit: 1 });
      })
      .then(() => {
        PatronGroups.createViaApi(userData.group).then((id) => {
          patronGroupId = id;
        });
      })

      // Fetch fallback policy IDs from the current circulation rules and look up their names
      .then(() => {
        CirculationRules.getViaApi().then(({ rulesAsText }) => {
          const ruleProps = CirculationRules.getRuleProps(rulesAsText);

          cy.okapiRequest({ path: `loan-policy-storage/loan-policies/${ruleProps.l}` }).then(
            ({ body }) => {
              fallbackLoanPolicyName = body.name;
            },
          );
          cy.okapiRequest({ path: `overdue-fines-policies/${ruleProps.o}` }).then(({ body }) => {
            fallbackOverdueFinePolicyName = body.name;
          });
          cy.okapiRequest({ path: `lost-item-fees-policies/${ruleProps.i}` }).then(({ body }) => {
            fallbackLostItemFeePolicyName = body.name;
          });
        });
      })

      // Fetch policies to be used in the specific circulation rule (m book)
      .then(() => {
        return cy.getOverdueFinePolicy({ limit: 1 }).then((policies) => {
          if (policies && policies.length > 0) {
            overdueFinePolicy = policies[0];
          }
        });
      })
      .then(() => {
        return cy.getLostItemFeesPolicy({ limit: 1 }).then((policies) => {
          if (policies && policies.length > 0) {
            lostItemFeePolicy = policies[0];
          }
        });
      })
      .then(() => {
        return cy.getRequestPolicy({ limit: 1 }).then((policies) => {
          if (policies && policies.length > 0) {
            requestPolicy = policies[0];
          }
        });
      })
      .then(() => {
        return cy.getNoticePolicy({ limit: 1 }).then((policies) => {
          if (policies && policies.length > 0) {
            noticePolicy = policies[0];
          }
        });
      })

      // Find or create a one-hour loan policy for the specific rule
      .then(() => {
        LoanPolicy.getApi({ query: 'name="One Hour" or name="one-hour"', limit: 1 }).then(
          (response) => {
            if (response.body.loanPolicies.length > 0) {
              loanPolicy = response.body.loanPolicies[0];
            } else {
              LoanPolicy.createViaApi({
                name: 'One Hour',
                description: 'Test one hour loan policy',
                loanable: true,
                loansPolicy: {
                  closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
                  period: { duration: 1, intervalId: 'Hours' },
                  profileId: 'Rolling',
                },
                renewable: false,
              }).then((policy) => {
                loanPolicy = policy;
              });
            }
          },
        );
      })

      // Create Item A: microform — matches only the fallback rule
      .then(() => {
        return cy.getMicroformMaterialType().then((materialType) => {
          itemDataA.materialTypeId = materialType.id;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: itemDataA.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: itemDataA.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: itemDataA.materialTypeId },
              },
            ],
          });
        });
      })

      // Create Item B: book — matches the specific rule m book
      .then(() => {
        return cy.getBookMaterialType().then((materialType) => {
          itemDataB.materialTypeId = materialType.id;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: itemDataB.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: itemDataB.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: itemDataB.materialTypeId },
              },
            ],
          });
        });
      })

      // Create specific circulation rule for book material type
      .then(() => {
        CirculationRules.addRuleViaApi(
          { m: itemDataB.materialTypeId },
          {
            l: loanPolicy.id,
            r: requestPolicy.id,
            n: noticePolicy.id,
            o: overdueFinePolicy.id,
            i: lostItemFeePolicy.id,
          },
        ).then((newRule) => {
          addedRule = newRule;
        });
      });

    cy.createTempUser(
      [
        permissions.checkoutAll.gui,
        permissions.checkoutViewLoans.gui,
        permissions.uiUsersViewLoans.gui,
        permissions.uiUsersfeefinesView.gui,
        permissions.loansAll.gui,
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

    // Fetching the current "Other settings" values.
    // Checking if "Patron id(s) for checkout scanning" is enabled by "Barcode".
    // Enabling it if not already enabled.
    OtherSettings.enablePrefPatronIdentifierIfNeeded(BARCODE, (value) => {
      shouldRemoveBarcodeAfterTest = value;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    CirculationRules.deleteRuleViaApi(addedRule);
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemDataA.barcode,
      servicePointId: servicePoint.id,
    });
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemDataB.barcode,
      servicePointId: servicePoint.id,
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemDataA.barcode);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemDataB.barcode);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroupId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    // Fetching the current "Other settings" values.
    // Checking if "Patron id(s) for checkout scanning" is enabled by "Barcode".
    // Verifying that it was enabled earlier.
    // Ensuring that "Barcode" is not the only enabled value, since at least one value is required.
    // Disabling "Barcode" if appropriate.
    OtherSettings.disablePrefPatronIdentifierIfNeeded(BARCODE, shouldRemoveBarcodeAfterTest);
  });

  it(
    'C593 Check out: (Testing circulation rules) - perform check-outs for rule with nested attributes/policies and for fallback policy (criticalPath) (vega)',
    { tags: ['criticalPath', 'vega', 'C593'] },
    () => {
      // Step 1: Enter user barcode into "Scan patron card" field and click Enter
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.checkUserInfo(userData, userData.group);

      // Step 2: Enter Item A barcode (microform) into "Scan items" field and click Enter
      CheckOutActions.checkOutItem(itemDataA.barcode);
      CheckOutActions.verifyItemCheckedOut(itemDataA.barcode);

      // Step 3: Click "..." > "Loan details" for Item A
      CheckOutActions.openLoanDetails();

      // Step 4: Verify that policies match the fallback circulation rule
      CheckOutActions.checkLoanPolicyInLoanDetails(fallbackLoanPolicyName);
      CheckOutActions.checkOverdueFinePolicyInLoanDetails(fallbackOverdueFinePolicyName);
      CheckOutActions.checkLostItemFeePolicyInLoanDetails(fallbackLostItemFeePolicyName);

      // Step 5: Go back to "Check out" app and enter Item B barcode (book)
      cy.visit(TopMenu.checkOutPath);
      CheckOutActions.waitLoading();
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.checkOutItem(itemDataB.barcode);
      CheckOutActions.verifyItemCheckedOut(itemDataB.barcode);

      // Step 6: Open Loan details for Item B and verify policies match the specific rule (m book)
      CheckOutActions.openLoanDetails();
      CheckOutActions.checkLoanPolicyInLoanDetails(loanPolicy.name);
      CheckOutActions.checkOverdueFinePolicyInLoanDetails(overdueFinePolicy.name);
      CheckOutActions.checkLostItemFeePolicyInLoanDetails(lostItemFeePolicy.name);
    },
  );
});
