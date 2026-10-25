export function buildFarmSupplyInsight(options) {
    const farmPlotsByCrop = {};
    for (const step of options.producing.filter(row => row.facility === 'Farmland')) {
        if (step.item_name) {
            farmPlotsByCrop[step.item_name] = (farmPlotsByCrop[step.item_name] || 0) + (step.facility_count || 1);
        }
    }
    const farmSummaryParts = Object.entries(farmPlotsByCrop).map(([crop, count]) => `${count} ô ${options.prettyItem(crop)}`);
    const farmSummary = farmSummaryParts.join(', ') || (options.isVi ? 'Đất nông nghiệp' : 'Farmland');

    const downstreamSteps = options.producing.filter(row => row.facility !== 'Farmland' && row.facility !== 'Woodland' && row.item_name);
    const downstreamTargetNames = [...new Set(downstreamSteps.map(step => {
        const rawFacility = step.facility ? step.facility.replace(/ \((Manual|Electric|Prismana)\)$/, '').trim() : '';
        const facilityName = options.getFacilityDisplayName(rawFacility);
        const itemName = options.prettyItem(step.item_name);
        const rateText = step.units_per_second ? ` (${options.perHour(step.units_per_second)}/h)` : '';
        return `<strong>${facilityName}</strong> (${itemName}${rateText})`;
    }))].slice(0, 3);

    let supplyChainDescription = '';
    if (downstreamTargetNames.length > 0) {
        supplyChainDescription = options.isVi
            ? `Cung cấp trực tiếp cho chuỗi chế biến: ${downstreamTargetNames.join(', ')}.`
            : `Directly feeds downstream processing: ${downstreamTargetNames.join(', ')}.`;
    }

    const title = options.isVi ? '🌾 Đã chọn: Chiến lược nông trại & Chuỗi cung ứng' : '🌾 Selected: Farmland & Supply Strategy';
    const description = options.isVi
        ? `Bố trí <strong>${farmSummary}</strong>.<br>`
          + (supplyChainDescription ? `${supplyChainDescription}<br>` : '')
          + `<em><strong>Tại sao chọn:</strong> Nhờ Aniimo tưới nước giảm 25% thời gian sinh trưởng (2 vụ/giờ), chuỗi cây trồng được tối ưu theo thời gian thu hoạch và khả năng hấp thụ nguyên liệu trực tiếp của các cơ sở chế biến trên đảo (đồng bộ công suất, không gây dư thừa tồn đọng kho bãi hay thiếu hụt nguyên liệu).</em>`
        : `Deployed <strong>${farmSummary}</strong>.<br>`
          + (supplyChainDescription ? `${supplyChainDescription}<br>` : '')
          + `<em><strong>Why selected:</strong> With Aniimo watering cutting growth time by 25% (2 cycles/hr), crop mix is calibrated to watered harvest timings and downstream processing throughput (zero idle waste or raw material starvation).</em>`;
    return { title, description, farmSummary, supplyChainDescription };
}
