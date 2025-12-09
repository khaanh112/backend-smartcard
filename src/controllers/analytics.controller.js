import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Track profile view (no auth required)
export const trackView = async (req, res) => {
  try {
    const { profileId, source = 'DIRECT', referrer } = req.body;

    // Get visitor info
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'];

    // Validate profile exists and is published
    const profile = await prisma.profile.findUnique({
      where: { id: profileId, isPublished: true },
    });

    if (!profile) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Profile not found',
      });
    }

    // Create view record
    await prisma.profileView.create({
      data: {
        profileId,
        source: source.toUpperCase(),
        ipAddress: ipAddress?.substring(0, 45), // Limit length
        userAgent: userAgent?.substring(0, 255), // Limit length
        referrer: referrer?.substring(0, 255),
      },
    });

    res.json({
      message: 'View tracked successfully',
    });
  } catch (error) {
    console.error('Track view error:', error);
    // Don't expose error details to public
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to track view',
    });
  }
};

// Get profile analytics (authenticated)
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.params;

    // Verify profile belongs to user
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId },
    });

    if (!profile) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Profile not found or unauthorized',
      });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all views
    const allViews = await prisma.profileView.findMany({
      where: { profileId },
      orderBy: { timestamp: 'desc' },
    });

    // Calculate metrics
    const totalViews = allViews.length;
    const viewsLast7Days = allViews.filter(v => v.timestamp >= sevenDaysAgo).length;
    const viewsLast30Days = allViews.filter(v => v.timestamp >= thirtyDaysAgo).length;

    // QR scans
    const totalQRScans = allViews.filter(v => v.source === 'QR_SCAN').length;
    const qrScansLast7Days = allViews.filter(
      v => v.source === 'QR_SCAN' && v.timestamp >= sevenDaysAgo
    ).length;

    // Views by source
    const viewsBySource = allViews.reduce((acc, view) => {
      acc[view.source] = (acc[view.source] || 0) + 1;
      return acc;
    }, {});

    // Views by day (last 30 days)
    const viewsByDay = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      viewsByDay[dateKey] = 0;
    }
    
    allViews.forEach(view => {
      if (view.timestamp >= thirtyDaysAgo) {
        const dateKey = view.timestamp.toISOString().split('T')[0];
        if (viewsByDay[dateKey] !== undefined) {
          viewsByDay[dateKey]++;
        }
      }
    });

    // Device breakdown (simple mobile vs desktop detection)
    const mobileViews = allViews.filter(v => 
      v.userAgent?.toLowerCase().includes('mobile') || 
      v.userAgent?.toLowerCase().includes('android')
    ).length;
    const desktopViews = totalViews - mobileViews;

    // Top referrers
    const referrerCounts = allViews
      .filter(v => v.referrer && v.referrer !== 'direct')
      .reduce((acc, view) => {
        const domain = extractDomain(view.referrer);
        acc[domain] = (acc[domain] || 0) + 1;
        return acc;
      }, {});
    
    const topReferrers = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    const analytics = {
      totalViews,
      viewsLast7Days,
      viewsLast30Days,
      totalQRScans,
      qrScansLast7Days,
      viewsBySource,
      viewsByDay: Object.entries(viewsByDay).map(([date, views]) => ({
        date,
        views,
      })),
      deviceBreakdown: {
        mobile: mobileViews,
        desktop: desktopViews,
      },
      topReferrers,
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch analytics',
    });
  }
};

// Export analytics as CSV (authenticated)
export const exportAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.params;

    // Verify profile belongs to user
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId },
      select: { fullName: true, slug: true },
    });

    if (!profile) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Profile not found or unauthorized',
      });
    }

    // Get all views
    const views = await prisma.profileView.findMany({
      where: { profileId },
      orderBy: { timestamp: 'desc' },
    });

    // Generate CSV
    const csvRows = [
      ['Timestamp', 'Source', 'Referrer', 'Device Type'].join(','),
    ];

    views.forEach(view => {
      const deviceType = view.userAgent?.toLowerCase().includes('mobile') ? 'Mobile' : 'Desktop';
      csvRows.push([
        view.timestamp.toISOString(),
        view.source,
        view.referrer || 'Direct',
        deviceType,
      ].join(','));
    });

    const csv = csvRows.join('\n');
    const filename = `${profile.slug}-analytics-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export analytics',
    });
  }
};

// Helper function to extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}