export function buildLogisticsInsight(options) {
    const {
        isVi, producing = [], lastPlanInput = null, lastEmodeCounts = {}, suCount = 3,
        getGeneratorCapacity, calculatePowerWatts,
    } = options;
    const title = isVi ? '⚡ Vận hành điện lưới & Hậu cần đa kho' : '⚡ Power Grid & Multi-SU Logistics';
    const emodeMachinesCount = producing
        .filter(step => step.is_emode || (step.facility && step.facility.includes('(Electric)')))
        .reduce((sum, step) => sum + (step.facility_count || 1), 0);
    const savedCounts = lastPlanInput?.emode_facility_counts || {};
    const emodeActive = emodeMachinesCount > 0 || Object.values(savedCounts).some(count => count > 0);
    let emodeDetail = isVi ? 'Đang vận hành ở Chế độ thủ công tiêu chuẩn với Aniimo.' : 'Operating in Standard Manual Mode.';
    if (emodeActive) {
        const genWatts = getGeneratorCapacity();
        const activeWatts = calculatePowerWatts(emodeMachinesCount > 0 ? lastEmodeCounts : savedCounts);
        const countDisplay = emodeMachinesCount > 0
            ? emodeMachinesCount
            : Object.values(savedCounts).reduce((sum, count) => sum + count, 0);
        emodeDetail = isVi
            ? `Đã kích hoạt Chế độ điện trên <strong>${countDisplay} máy móc & cơ sở</strong> (${activeWatts}W / ${genWatts}W), giải phóng Aniimo chuyển sang <strong>Tưới nước nông trại/lâm nghiệp</strong> (giúp tăng 25% tốc độ phát triển toàn đảo).`
            : `Electric Mode active on <strong>${countDisplay} machines & facilities</strong> (${activeWatts}W / ${genWatts}W), freeing Aniimo workers for <strong>island-wide crop watering</strong> (25% faster growth).`;
    }
    const suDetail = isVi
        ? `Homeland bố trí <strong>${suCount} Kho lưu trữ phân tán (SU)</strong> (Nông trại, Xưởng, Trung tâm), giúp giảm ~58% quãng đường di chuyển của Aniimo.`
        : `Homeland deployed with <strong>${suCount} distributed Storage Units</strong>, cutting Aniimo hauling walk-time by ~58%.`;
    return { title, description: `• ${emodeDetail}<br>• ${suDetail}` };
}
