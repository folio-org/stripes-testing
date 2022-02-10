import holdingsRecordView from './holdingsRecordView';
import InventoryInstance from './inventoryInstance';
import QuickMarcEditor from '../quickMarcEditor';
import interactorsTools from '../../utils/interactorsTools';

export default {

  addMarcHoldingRecord:() => {
    InventoryInstance.goToMarcHoldingRecordAdding();
    QuickMarcEditor.waitLoading();
    const quickmarcEditor = new QuickMarcEditor(InventoryInstance.validOCLC);
    quickmarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
    QuickMarcEditor.pressSaveAndClose();
    interactorsTools.closeCalloutMessage();
    holdingsRecordView.waitLoading();
  },
};
