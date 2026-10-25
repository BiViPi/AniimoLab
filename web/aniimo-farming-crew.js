export function buildAniimoFarmingCrew(totalFarmPlots, isVi) {
    if (totalFarmPlots <= 0) return { members: [], physicalWorkers: [], total: 0 };

    let members;
    let physicalWorkers;
    if (totalFarmPlots >= 30) {
        members = [
            { facility: isVi ? `Khai khẩn (${totalFarmPlots} ô đất)` : `Reclaiming (${totalFarmPlots} plots)`, worker: 'Gracewing (Sơn Lâm)', count: 2, ability: 'Earth', level: 2, desc: isVi ? 'Thổ Lv.2 · Chuyên tâm 100%' : 'Earth Lv.2 · 100% focused', specific: 'Gracewing' },
            { facility: isVi ? `Gieo trồng (${totalFarmPlots} ô đất)` : `Sowing (${totalFarmPlots} plots)`, worker: 'Irisalis (Leafy phụ)', count: 2, ability: 'Grass', level: 3, desc: isVi ? 'Thảo Lv.3 · Gieo luân phiên' : 'Grass Lv.3 · Alternating sow', specific: 'Irisal' },
            { facility: isVi ? `Tưới nước (${totalFarmPlots} ô × 2 đợt)` : `Watering (${totalFarmPlots} plots × 2)`, worker: 'Piopiota (Đêm) + Leafy', count: 2, ability: 'Water', level: 3, desc: isVi ? 'Thủy Lv.3, Ám Lv.2 · Tưới đệm' : 'Water Lv.3, Dark Lv.2', specific: 'Piopiota' },
            { facility: isVi ? 'Gặt & Đốn gỗ/Nhựa (Ám)' : 'Harvest: Reap & Log (Dark)', worker: 'Pawney + Rookey', count: 2, ability: 'Dark', level: 4, desc: isVi ? 'Ám Lv.4 · Gặt nông sản & gỗ' : 'Dark Lv.4 · Harvest crops & logs', specific: 'Pawney' },
            { facility: isVi ? 'Hái hoa/trái/hạt (Cỏ)' : 'Harvest: Collect (Grass)', worker: 'Irisalis (Leafy phụ)', count: isVi ? '2× (Kiêm nhiệm)' : '2× (Shared)', ability: 'Grass', level: 3, desc: isVi ? 'Thảo Lv.3 · Thu hái hoa quả' : 'Grass Lv.3 · Collect fruits', specific: 'Irisal', isShared: true },
            { facility: isVi ? 'Vận chuyển về SU' : 'Hauling to Storage', worker: 'Pawney + Rookey', count: isVi ? '2-3× (Kiêm nhiệm)' : '2-3× (Shared)', ability: 'Hauling', level: 4, desc: isVi ? 'Khuân Vác Lv.4 · Đưa nông sản về kho' : 'Hauling Lv.4 · Haul to SU', specific: 'Pawney', isShared: true }
        ];
        physicalWorkers = [
            { ability: 'Earth', level: 2, count: 2, name: 'Gracewing (Sơn Lâm)', specific: 'Gracewing', desc: isVi ? 'Khai khẩn đất' : 'Tilling plots' },
            { ability: 'Grass', level: 3, count: 1, name: 'Irisalis', specific: 'Irisal', desc: isVi ? 'Gieo hạt & Hái quả' : 'Sowing & picking' },
            { ability: 'Grass', level: 3, count: 1, name: 'Leafy', specific: 'Leafy', desc: isVi ? 'Gieo hạt & Tưới phụ' : 'Backup sowing' },
            { ability: 'Water', level: 3, count: 1, name: 'Piopiota (Đêm)', specific: 'Piopiota', desc: isVi ? 'Tưới nước đệm' : 'Buffer watering' },
            { ability: 'Dark', level: 4, count: 2, name: 'Pawney', specific: 'Pawney', desc: isVi ? 'Gặt hái & Vận chuyển' : 'Harvest & hauling' },
            { ability: 'Dark', level: 3, count: 1, name: 'Rookey', specific: 'Rookey', desc: isVi ? 'Đốn gỗ & Vận chuyển' : 'Logging & hauling' }
        ];
    } else {
        members = [
            { facility: isVi ? 'Khai khẩn' : 'Reclaiming', worker: 'Gracewing (Sơn Lâm)', count: 1, ability: 'Earth', level: 2, desc: isVi ? 'Thổ Lv.2 · Chuyên tâm 100%' : 'Earth Lv.2 · 100% focused', specific: 'Gracewing' },
            { facility: isVi ? 'Gieo hạt & Hái quả' : 'Sowing & Fruit Pick', worker: 'Irisalis', count: 1, ability: 'Grass', level: 3, desc: isVi ? 'Thảo Lv.3 · Gieo & hái' : 'Grass Lv.3 · Sow & pick', specific: 'Irisal' },
            { facility: isVi ? 'Tưới nước' : 'Watering', worker: 'Piopiota (Đêm)', count: 1, ability: 'Water', level: 3, desc: isVi ? 'Thủy Lv.3 · Tưới đệm' : 'Water Lv.3 · Fast buffer', specific: 'Piopiota' },
            { facility: isVi ? 'Gặt & Đốn gỗ' : 'Harvesting & Logging', worker: 'Pawney / Rookey', count: 1, ability: 'Dark', level: 4, desc: isVi ? 'Ám Lv.4 · Gặt nông sản' : 'Dark Lv.4 · Harvest', specific: 'Pawney' },
            { facility: isVi ? 'Vận chuyển' : 'Hauling', worker: 'Pawney / Rookey', count: 1, ability: 'Hauling', level: 3, desc: isVi ? 'Khuân Vác Lv.3 · Về kho' : 'Hauling Lv.3 · To storage', specific: 'Rookey' }
        ];
        physicalWorkers = [
            { ability: 'Earth', level: 2, count: 1, name: 'Gracewing (Sơn Lâm)', specific: 'Gracewing', desc: isVi ? 'Khai khẩn đất' : 'Tilling plots' },
            { ability: 'Grass', level: 3, count: 1, name: 'Irisalis', specific: 'Irisal', desc: isVi ? 'Gieo hạt & Hái quả' : 'Sowing & picking' },
            { ability: 'Water', level: 3, count: 1, name: 'Piopiota (Đêm)', specific: 'Piopiota', desc: isVi ? 'Tưới nước' : 'Watering' },
            { ability: 'Dark', level: 4, count: 1, name: 'Pawney', specific: 'Pawney', desc: isVi ? 'Gặt & Đốn gỗ' : 'Harvesting' },
            { ability: 'Hauling', level: 3, count: 1, name: 'Rookey', specific: 'Rookey', desc: isVi ? 'Vận chuyển' : 'Hauling' }
        ];
    }

    return { members, physicalWorkers, total: physicalWorkers.reduce((sum, worker) => sum + worker.count, 0) };
}
