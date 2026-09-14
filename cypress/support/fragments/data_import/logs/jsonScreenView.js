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

  // Record name fits its line, tabs stay on one row, and each tab's label text stays inside the
  // tab list box. Measures fractional getBoundingClientRect edges of the label <span> (not the
  // padded button), so invisible padding overflow doesn't fail it; EPSILON covers the ~1px border.
  verifyRecordNameAndTabsFitInHeader: () => {
    const EPSILON = 1;
    const fitsWithin = (child, parent, label) => {
      expect(child.left, `${label} should not be clipped on the left`).to.be.at.least(
        parent.left - EPSILON,
      );
      expect(child.right, `${label} should not be clipped on the right`).to.be.at.most(
        parent.right + EPSILON,
      );
    };

    cy.get('#job-log-colorizer').then(($root) => {
      const root = $root[0];
      const header = root.querySelector('[class^="toolbar"] [class^="header"]');
      const toolbarRect = root.querySelector('[class^="toolbar"]').getBoundingClientRect();
      const tabList = root.querySelector('[role="tablist"]');
      const tabs = [...tabList.querySelectorAll('[role="tab"]')];
      const tabListRect = tabList.getBoundingClientRect();

      // scrollWidth/clientWidth are integer-rounded, hence +1
      expect(header.scrollWidth, 'record name should not overflow its line').to.be.at.most(
        header.clientWidth + 1,
      );
      fitsWithin(tabListRect, toolbarRect, 'record type tabs');
      expect(
        new Set(tabs.map((tab) => Math.round(tab.getBoundingClientRect().top))).size,
        'all record type tabs should stay on a single row',
      ).to.equal(1);
      tabs.forEach((tab) => {
        const label = tab.querySelector('[class*="inner"]') || tab;
        fitsWithin(
          label.getBoundingClientRect(),
          tabListRect,
          `"${label.textContent.trim()}" tab label`,
        );
      });
    });
  },
};
