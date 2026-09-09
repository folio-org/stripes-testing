import { HTML, including } from '@interactors/html';
import { Button, ButtonGroup } from '../../../../../interactors';

const srsMarcTab = ButtonGroup().find(Button(including('SRS MARC')));
const instanceTab = ButtonGroup().find(Button(including('Instance')));
const itemTab = ButtonGroup().find(Button(including('Item')));
const incomingRecordTab = ButtonGroup().find(Button(including('Incoming record')));
const holdingsTab = ButtonGroup().find(Button(including('Holdings')));
const authorityTab = ButtonGroup().find(Button(including('Authority')));
const orderTab = ButtonGroup().find(Button(including('Order')));
const invoiceTab = ButtonGroup().find(Button(including('Invoice')));

export default {
  verifyJsonScreenIsOpened: () => {
    cy.get('#logs-pane').should('exist');
    // TODO need to wait until page will be loaded
    cy.wait(2000);
  },

  getInstanceHrid: () => {
    return cy
      .contains('"instanceHrid":')
      .should('exist')
      .invoke('parent')
      .find('[class*="string--"]')
      .invoke('text')
      .then((text) => {
        const instanceHrid = text.match(/in(\d+)/);
        return instanceHrid[0];
      });
  },

  getOrderNumber: () => {
    return cy
      .contains('"poLineNumber":')
      .should('exist')
      .invoke('parent')
      .find('[class*="string--"]')
      .invoke('text')
      .then((text) => {
        const orderNumber = text.match(/"(\d+-\d+)""/);
        return orderNumber[1].replace('-1', '');
      });
  },

  openMarcSrsTab: () => {
    cy.do(srsMarcTab.click());
    cy.do(
      srsMarcTab.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },
  openInstanceTab: () => cy.do(instanceTab.click()),
  openItemTab: () => cy.do(itemTab.click()),
  openHoldingsTab: () => cy.do(holdingsTab.click()),
  openOrderTab: () => cy.do(orderTab.click()),
  openAuthorityTab: () => {
    cy.do(authorityTab.click());
    cy.do(
      authorityTab.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  verifyContentInTab: (value) => {
    cy.wait(1000); // wait for content to load
    cy.expect(HTML(including(value)).exists());
  },
  verifyContentNotExistInTab: (value) => {
    cy.expect(HTML(including(value)).absent());
  },

  verifyTabsPresented: () => {
    cy.expect([
      incomingRecordTab.exists(),
      srsMarcTab.exists(),
      instanceTab.exists(),
      holdingsTab.exists(),
      itemTab.exists(),
      authorityTab.exists(),
      orderTab.exists(),
      invoiceTab.exists(),
    ]);
  },

  verifyIncomingRecordTabIsActive: () => {
    cy.do(
      incomingRecordTab.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  // verifies the record name and the record type tabs fit in the header box: the record name
  // does not overflow its own line, and the tabs stay on a single row without overflowing
  // the tab list (a narrow viewport is the scenario where either could start wrapping/clipping)
  verifyRecordNameAndTabsFitInHeader: () => {
    cy.get('#job-log-colorizer [class*="toolbar"]').then(($toolbar) => {
      const el = $toolbar[0];
      expect(
        el.scrollWidth,
        'record name and tabs together should not overflow the header box',
      ).to.be.at.most(el.clientWidth);
    });

    cy.get('#job-log-colorizer .toolbar [class*="header"]').then(($header) => {
      const el = $header[0];
      expect(el.scrollWidth, 'record name should not overflow the header box').to.be.at.most(
        el.clientWidth,
      );
    });

    cy.get('#job-log-colorizer [role="tablist"]').then(($tabList) => {
      const tabListEl = $tabList[0];
      expect(
        tabListEl.scrollWidth,
        'record type tabs should not overflow the header box',
      ).to.be.at.most(tabListEl.clientWidth);

      const tabListRect = tabListEl.getBoundingClientRect();
      const tabs = [...tabListEl.querySelectorAll('[role="tab"]')];

      const tops = new Set(tabs.map((tab) => tab.getBoundingClientRect().top));
      expect(tops.size, 'all record type tabs should stay on a single row').to.equal(1);

      // check each tab button's own edges against the tablist's own box, not the viewport - a
      // button can visually escape its container's border (e.g. via overflow: visible) even when
      // the container itself measures as not overflowing
      tabs.forEach((tab) => {
        const rect = tab.getBoundingClientRect();
        expect(
          rect.left,
          `"${tab.textContent.trim()}" tab should not start outside the left edge of the tabs box`,
        ).to.be.at.least(tabListRect.left);
        expect(
          rect.right,
          `"${tab.textContent.trim()}" tab should not extend outside the right edge of the tabs box`,
        ).to.be.at.most(tabListRect.right);
      });
    });
  },
};
