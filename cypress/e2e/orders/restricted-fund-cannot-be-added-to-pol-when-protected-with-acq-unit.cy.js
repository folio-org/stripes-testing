import permissions from '../../support/dictionary/permissions';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const defaultFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
  };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  const polData = {
    itemDetails: {
      title: `autotest_pol_title_${getRandomPostfix()}`,
    },
    poLineDetails: {
      acquisitionMethod: 'Approval plan',
      orderFormat: 'Physical resource',
      materialType: 'text',
    },
    costDetails: {
      physicalUnitPrice: '50',
      quantityPhysical: '1',
    },
  };
  let order;
  let user;
  let acquisitionUnit;
  let firstLocation;
  let secondLocation;
  let servicePointId;

  before(() => {
    cy.getAdminToken();

    acquisitionUnit = AcquisitionUnits.getDefaultAcquisitionUnit({
      protectRead: true,
      protectCreate: true,
      protectUpdate: true,
      protectDelete: true,
    });

    AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnit).then((acqUnitResponse) => {
      acquisitionUnit.id = acqUnitResponse.id;

      FiscalYears.createViaApi(defaultFiscalYear).then((fiscalYearResponse) => {
        defaultFiscalYear.id = fiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
        firstBudget.fiscalYearId = fiscalYearResponse.id;
        secondBudget.fiscalYearId = fiscalYearResponse.id;

        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          firstFund.ledgerId = defaultLedger.id;
          secondFund.ledgerId = defaultLedger.id;

          ServicePoints.getViaApi().then((servicePoint) => {
            servicePointId = servicePoint[0].id;

            NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
              (firstLocationResponse) => {
                firstLocation = firstLocationResponse;

                NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                  (secondLocationResponse) => {
                    secondLocation = secondLocationResponse;

                    Funds.createViaApi({
                      ...firstFund,
                      restrictByLocations: true,
                      locations: [{ locationId: firstLocation.id }],
                      acqUnitIds: [acquisitionUnit.id],
                    }).then((firstFundResponse) => {
                      firstFund.id = firstFundResponse.fund.id;
                      firstBudget.fundId = firstFundResponse.fund.id;

                      Budgets.createViaApi(firstBudget).then(() => {
                        Funds.createViaApi({
                          ...secondFund,
                          restrictByLocations: true,
                          locations: [{ locationId: secondLocation.id }],
                        }).then((secondFundResponse) => {
                          secondFund.id = secondFundResponse.fund.id;
                          secondBudget.fundId = secondFundResponse.fund.id;

                          Budgets.createViaApi(secondBudget).then(() => {
                            Organizations.createOrganizationViaApi(organization).then(
                              (responseOrganizations) => {
                                organization.id = responseOrganizations;

                                const orderData = {
                                  ...NewOrder.getDefaultOrder({ vendorId: organization.id }),
                                  orderType: 'One-Time',
                                  approved: false,
                                  workflowStatus: 'Pending',
                                };

                                Orders.createOrderViaApi(orderData).then((orderResponse) => {
                                  order = orderResponse;

                                  cy.createTempUser([
                                    permissions.uiOrdersCreate.gui,
                                    permissions.uiOrdersEdit.gui,
                                  ]).then((userProperties) => {
                                    user = userProperties;

                                    cy.login(user.username, user.password, {
                                      path: TopMenu.ordersPath,
                                      waiter: Orders.waitLoading,
                                    });
                                  });
                                });
                              },
                            );
                          });
                        });
                      });
                    });
                  },
                );
              },
            );
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Budgets.deleteViaApi(firstBudget.id);
    Budgets.deleteViaApi(secondBudget.id);
    Funds.deleteFundViaApi(firstFund.id);
    Funds.deleteFundViaApi(secondFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      firstLocation.institutionId,
      firstLocation.campusId,
      firstLocation.libraryId,
      firstLocation.id,
    );
    NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      secondLocation.institutionId,
      secondLocation.campusId,
      secondLocation.libraryId,
      secondLocation.id,
    );
    AcquisitionUnits.deleteAcquisitionUnitViaApi(acquisitionUnit.id);
  });

  it(
    'C434157 Restricted fund can not be added to POL when it is protected with Acquisition unit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C434157'] },
    () => {
      Orders.searchByParameter('PO number', order.poNumber);
      Orders.selectFromResultsList(order.poNumber);
      cy.wait(2000);
      OrderLines.addPOLine();

      OrderLineEditForm.fillOrderLineFields(polData);

      OrderLineEditForm.clickAddFundDistributionButton();

      OrderLineEditForm.expandFundIdDropdown();
      OrderLineEditForm.verifyFundInDropdown(firstFund.name, firstFund.code, false);
      OrderLineEditForm.verifyFundInDropdown(secondFund.name, secondFund.code, true);

      OrderLineEditForm.selectFundFromOpenDropdown(secondFund.name, secondFund.code);

      OrderLineEditForm.clickAddLocationButton();

      OrderLineEditForm.expandLocationDropdown(0);

      OrderLineEditForm.selectLocationFromDropdown(secondLocation.name);

      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1' }]);

      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLines.checkFundInPOL(secondFund);
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: 'Name (code)', value: secondLocation.name },
            { key: 'Quantity physical', value: '1' },
          ],
        ],
      });
    },
  );
});
