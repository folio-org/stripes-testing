describe('fse-edge', () => {
  // all test steps are hidden from report in order to hide sensitive edge related data (api key). TODO: update to hide only api key

  it(
    `TC195410 - edge-erm verification for ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'edge-erm', 'app-edge-complete', 'fast-check'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.postEdgeErm().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC195411 - edge-ncip verification for ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'edge-ncip', 'app-edge-complete', 'fast-check'] },
    () => {
      // Request body taken from https://github.com/folio-org/mod-ncip/tree/master/docs/sampleNcipMessages
      // UserIdentifierValue is specified as 'EBSCOSupport' in the requestBody

      const requestBody = `<?xml version="1.0" encoding="UTF-8"?>
    <NCIPMessage version="http://www.niso.org/schemas/ncip/v2_0/ncip_v2_0.xsd"
      xmlns="http://www.niso.org/2008/ncip">
      <LookupUser>
        <InitiationHeader>
          <FromAgencyId>
            <AgencyId>ReShare</AgencyId>
          </FromAgencyId>
          <ToAgencyId>
            <AgencyId>ReShare</AgencyId>
          </ToAgencyId>
        </InitiationHeader>
        <UserId>
          <AgencyId>Relais</AgencyId>
          <UserIdentifierValue>EBSCOSupport</UserIdentifierValue>
        </UserId>
        <UserElementType>Name Information</UserElementType>
        <UserElementType>User Address Information</UserElementType>
        <UserElementType>User Privilege</UserElementType>
        <UserElementType>User Id</UserElementType>
      </LookupUser>
    </NCIPMessage>`;
      cy.allure().logCommandSteps(false);
      cy.postEdgeNcip(requestBody).then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC195412 - edge-oai-pmh verification for ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'edge-oai', 'app-edge-complete', 'fast-check'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.getEdgeOai().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC195413 - edge-patron verification for ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'edge-patron', 'app-edge-complete', 'fast-check'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.getEdgePatron().then((response) => {
        // check either 200 or 404 since not always there is a patron for default user
        cy.expect(response.status).to.be.oneOf([200, 404]);
      });
    },
  );

  it(
    `TC195414 - edge-orders verification for ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'edge-orders', 'app-edge-complete'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.postEdgeOrders().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC195633 - edge-orders gobi integration check for ${Cypress.env('EDGE_HOST')}`,
    { tags: ['fse', 'api', 'edge-orders', 'nonProd', 'app-edge-complete'] },
    () => {
      // Request body taken from https://github.com/folio-org/mod-gobi/tree/master/src/test/resources/GOBIIntegrationServiceResourceImpl

      const requestBody = `<?xml version="1.0" encoding="UTF-8"?>
    <PurchaseOrder>
  <CustomerDetail>
    <BaseAccount>8910</BaseAccount>
    <SubAccount>891010</SubAccount>
  </CustomerDetail>
  <Order>
    <ListedPrintMonograph>
      <collection>
        <record>
          <leader>00000nam a2200000u  4500</leader>
          <controlfield tag="001">99974828471</controlfield>
          <controlfield tag="003">NhCcYBP</controlfield>
          <controlfield tag="005">20180905153857.0</controlfield>
          <controlfield tag="008">180905t20112011xx ||||||||||||||   eng d</controlfield>
          <datafield tag="020" ind1=" " ind2=" ">
            <subfield code="a">9780547572482</subfield>
            <subfield code="c">14.95</subfield>
          </datafield>
          <datafield tag="035" ind1=" " ind2=" ">
            <subfield code="a">(OCoLC)717297695</subfield>
          </datafield>
          <datafield tag="100" ind1="1" ind2=" ">
            <subfield code="a">DICK, PHILIP K</subfield>
          </datafield>
          <datafield tag="245" ind1="1" ind2="0">
            <subfield code="a">MAN IN THE HIGH CASTLE.</subfield>
          </datafield>
          <datafield tag="260" ind1=" " ind2=" ">
            <subfield code="a">BOSTON</subfield>
            <subfield code="b">MARINER BOOKS</subfield>
            <subfield code="c">2011</subfield>
          </datafield>
        </record>
      </collection>
      <OrderDetail>
        <FundCode>USHIST</FundCode>
        <Location>KU/CC/DI/A</Location>
        <Quantity>2</Quantity>
        <YBPOrderKey>99974828471</YBPOrderKey>
        <OrderPlaced>2018-09-05T15:38:55</OrderPlaced>
        <Initials>Mark</Initials>
        <ListPrice>
          <Amount>14.95</Amount>
          <Currency>USD</Currency>
        </ListPrice>
        <NetPrice>
          <Amount>13.16</Amount>
          <Currency>USD</Currency>
        </NetPrice>
        <LocalData>
          <Description>LocalData1</Description>
          <Value>Book</Value>
        </LocalData>
        <LocalData>
          <Description>LocalData2</Description>
          <Value>Notify requester upon receipt</Value>
        </LocalData>
        <LocalData>
          <Description>LocalData3</Description>
          <Value>Anne Esterhazy</Value>
        </LocalData>
        <LocalData>
          <Description>LocalData4</Description>
          <Value>signed-edition,vip-order</Value>
        </LocalData>
      </OrderDetail>
    </ListedPrintMonograph>
  </Order>
      </PurchaseOrder>`;
      cy.allure().logCommandSteps(false);
      cy.postEdgeOrdersGobiIntegration(requestBody).then((response) => {
        cy.expect(response.status).to.eq(201);
      });
    },
  );

  // TODO: add back 'edge-rtac', 'app-edge-complete' tags after fixing the test stability issue
  it(
    `TC195415 - edge-rtac verification for ${Cypress.env('EDGE_HOST')}`,
    { tags: ['fse', 'api'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));

      cy.getHoldings().then((holdings) => {
        // If no holdings returned from '/holdings-storage/holdings', then skip edge-rtac test
        if (!holdings || !holdings[0]) {
          cy.log('No holdings returned. Skipping edge-rtac test.');
          return;
        }
        cy.log(holdings[0]);
        // If instance uuid is returned from '/holdings-storage/holdings', then call edge-rtac api with it,
        // else skip edge-rtac
        if (holdings[0].instanceId) {
          cy.getEdgeRtac(holdings[0].instanceId).then((response) => {
            cy.expect(response.status).to.eq(200);
          });
        } else {
          cy.log('No instanceId in holdings. Skipping edge-rtac test.');
        }
      });
    },
  );

  it(
    `TC195958 - edge-dematic EMS integration verification for ${Cypress.env('EDGE_HOST')}`,
    { tags: ['fse', 'api', 'edge-dematic', 'app-edge-complete'] },
    () => {
      // skip this test for bugfest env as it contains incorrect data causing test failures
      if (Cypress.env('EDGE_HOST') && Cypress.env('EDGE_HOST').includes('bugfest')) {
        cy.log('Skipping test for bugfest environment');
        return;
      }
      cy.allure().logCommandSteps(false);
      cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
      cy.getAllRemoteStorageConfigurations().then((remoteConfigurations) => {
        // filter response by provider name - dematic like
        const dematicEmsid = remoteConfigurations.body.configurations.filter((config) => config.providerName.toLowerCase().includes('dematic'));

        if (dematicEmsid.length === 0) {
          cy.log(
            'No external storage configuration with Dematic type found. Skipping edge-dematic test.',
          );
          return;
        }

        cy.getEdgeDematicAsrItems(dematicEmsid[0].id).then((itemsResponse) => {
          cy.expect(itemsResponse.status).to.eq(200);
          // Verify the Content-Type response header
          cy.expect(itemsResponse.headers['content-type']).to.include('xml');
          // Verify the response body contains valid XML
          const responseBody = itemsResponse.body;
          // Ensure response body include asrRequests XML declaration
          expect(responseBody).to.include('<asrItems');
        });
        cy.getEdgeDematicAsrRequests(dematicEmsid[0].id).then((requestsResponse) => {
          cy.expect(requestsResponse.status).to.eq(200);
          // Verify the Content-Type response header
          cy.expect(requestsResponse.headers['content-type']).to.include('xml');
          // Verify the response body contains valid XML
          const responseAsrRequestsBody = requestsResponse.body;
          // Ensure response body include asrRequests XML declaration
          expect(responseAsrRequestsBody).to.include('<asrRequests');
        });
      });
    },
  );
});
