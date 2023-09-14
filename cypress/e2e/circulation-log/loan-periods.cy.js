import uuid from 'uuid';

import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { ITEM_STATUS_NAMES, LOAN_TYPE_NAMES } from '../../support/constants';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import MultipieceCheckOut from '../../support/fragments/checkout/modals/multipieceCheckOut';
import DateTools from '../../support/utils/dateTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemActions from '../../support/fragments/inventory/inventoryItem/itemActions';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId;
let servicePointId;
const instanceId = uuid();
const holdingId = uuid();
const itemId = uuid();
let loanTypes;
let materialTypes;
let locations;
let holdingTypes;
let instanceTypes;
let users;
let addedCirculationRule;
let originalCirculationRules;

const loanPolicyBody = {
  id: uuid(),
  name: getTestEntityValue('1_day'),
  loanable: true,
  loansPolicy: {
    closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
    period: {
      duration: 1,
      intervalId: 'Days',
    },
    profileId: 'Rolling',
  },
  renewable: true,
  renewalsPolicy: {
    unlimited: false,
    numberAllowed: 1,
    renewFromId: 'SYSTEM_DATE',
  },
};

describe('circulation-log loan period', () => {
  before('create inventory instance', () => {
    cy.createTempUser([
      permissions.circulationLogAll.gui,
      permissions.checkoutAll.gui,
      permissions.checkinAll.gui,
    ]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.circulationLogPath);
      cy.getAdminToken()
        .then(() => {
          LoanPolicy.createViaApi(loanPolicyBody);
          InventoryInstances.getLoanTypes({
            limit: 1,
            query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"`,
          }).then((loanTypesRes) => {
            loanTypes = loanTypesRes;
          });
          InventoryInstances.getMaterialTypes({ limit: 1 }).then((materialTypesRes) => {
            materialTypes = materialTypesRes;
          });
          InventoryInstances.getLocations({ limit: 1 }).then((locationsRes) => {
            locations = locationsRes;
          });
          InventoryInstances.getHoldingTypes({ limit: 1 }).then((holdingTypesRes) => {
            holdingTypes = holdingTypesRes;
          });
          InventoryInstances.getInstanceTypes({ limit: 1 }).then((instanceTypesRes) => {
            instanceTypes = instanceTypesRes;
          });
          ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
            servicePointId = res[0].id;
          });
          Users.getUsers({
            limit: 1,
            query: `"personal.lastName"="${userProperties.username}" and "active"="true"`,
          }).then((usersRes) => {
            users = usersRes;
          });
          CirculationRules.getViaApi().then((circulationRule) => {
            originalCirculationRules = circulationRule.rulesAsText;
            const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
            const defaultProps = ` i ${ruleProps.i} r ${ruleProps.r} o ${ruleProps.o} n ${ruleProps.n} l ${loanPolicyBody.id}`;
            addedCirculationRule = ` \nm ${materialTypes[0].id}: ${defaultProps}`;

            CirculationRules.updateCirculationRules({
              rulesAsText: `${originalCirculationRules}${addedCirculationRule}`,
            });
          });
        })
        .then(() => {
          UserEdit.addServicePointViaApi(servicePointId, userId);
          cy.getUserServicePoints(users[0].id);
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              id: instanceId,
              instanceTypeId: instanceTypes[0].id,
              title: `Barcode search test ${Number(new Date())}`,
            },
            holdings: [
              {
                id: holdingId,
                holdingsTypeId: holdingTypes[0].id,
                permanentLocationId: locations[0].id,
              },
            ],
            items: [
              {
                id: itemId,
                barcode: ITEM_BARCODE,
                missingPieces: '3',
                numberOfMissingPieces: '3',
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: loanTypes[0].id },
                materialType: { id: materialTypes[0].id },
              },
            ],
          })
            .then((specialInstanceIds) => {
              return specialInstanceIds.instanceId;
            })
            .then((instanceID) => {
              cy.getInstanceById(instanceID);
            });
        })
        .then(() => {
          cy.login(userProperties.username, userProperties.password);
          cy.visit(TopMenu.checkOutPath);
          CheckOutActions.checkOutItemUser(users[0].barcode, ITEM_BARCODE);
          MultipieceCheckOut.confirmMultipleCheckOut(ITEM_BARCODE);
        });
    });
  });

  after('delete test data', () => {
    CheckinActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId,
      checkInDate: new Date().toISOString(),
    }).then(() => {
      ItemActions.deleteItemViaApi(itemId);
      InventoryHoldings.deleteHoldingRecordViaApi(holdingId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(userId);
    });
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
  });

  it(
    'C645 Test "Days" loan period (vega)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      const itemDueDate = new Date(DateTools.getTomorrowDay());
      CheckOutActions.checkItemDueDate(
        DateTools.getFormattedDateWithSlashes({ date: itemDueDate }),
      );
    },
  );
});
