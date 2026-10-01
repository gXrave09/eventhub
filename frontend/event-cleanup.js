/**
 * EventHub — Automated Lifecycle & Expiration Purge Engine
 * 
 * Automatically purges event details, tickets, and registrations from registered
 * attendee devices when an event's end date/time has passed, while strictly
 * preserving all event details, analytics, and history on the creator's device.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    root.EventHubCleanup = exports;
    root.isCurrentUserCreator = exports.isCurrentUserCreator;
    root.isEventExpired = exports.isEventExpired;
    root.purgeExpiredEventsFromRegisteredDevices = exports.purgeExpiredEventsFromRegisteredDevices;
  }
})(typeof window !== 'undefined' ? window : this, function () {

  /**
   * Determine if the current device/user is the creator of the given event.
   * Creator devices track ownership in localStorage['eventhub_my_created_events'],
   * or via matching authenticated creator credentials.
   */
  function isCurrentUserCreator(ev) {
    if (!ev) return false;

    // 1. Device check: check if this device created the event
    try {
      const myCreated = JSON.parse(localStorage.getItem('eventhub_my_created_events') || '[]');
      if (ev.id && Array.isArray(myCreated) && myCreated.includes(ev.id)) {
        return true;
      }
    } catch (_) {}

    // 2. User credential check: match creator email or creator id
    let user = null;
    try { user = JSON.parse(localStorage.getItem('eventhub_user') || 'null'); } catch (_) {}
    let profile = null;
    try { profile = JSON.parse(localStorage.getItem('eventhub_profile') || 'null'); } catch (_) {}

    const userEmail = (user && user.email) || (profile && profile.email) || '';
    const userId = (user && (user.uid || user.id)) || (profile && profile.id) || '';

    if (userEmail) {
      const emailLower = userEmail.toLowerCase().trim();
      if (ev.creatorEmail && ev.creatorEmail.toLowerCase().trim() === emailLower) return true;
      if (ev.organizerEmail && ev.organizerEmail.toLowerCase().trim() === emailLower) return true;
    }

    if (userId) {
      if (ev.creatorId && String(ev.creatorId).trim() === String(userId).trim()) return true;
    }

    return false;
  }

  /**
   * Check if an event's end date and end time have passed.
   * Supports same-day daytime events, overnight multi-day events, and day-only events.
   */
  function isEventExpired(ev, testNow) {
    if (!ev || !ev.date) return false;
    try {
      const now = testNow || new Date();
      const parts = String(ev.date).trim().split('-');
      if (parts.length !== 3) return false;

      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const evDateOnly = new Date(year, month, day).getTime();

      // If event date is strictly in the future (tomorrow or later)
      if (evDateOnly > todayStart) {
        return false;
      }

      // If event date was in the past (before today)
      if (evDateOnly < todayStart) {
        // Check if it was an overnight event starting yesterday that ends today
        if (ev.endTime && ev.startTime) {
          const [startH, startM] = ev.startTime.split(':').map(Number);
          const [endH, endM] = ev.endTime.split(':').map(Number);
          const isOvernight = (endH < startH) || (endH === startH && endM < startM);

          if (isOvernight) {
            const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
            if (evDateOnly === yesterday) {
              const endDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 59, 999);
              return now.getTime() > endDateTime.getTime();
            }
          }
        }
        return true;
      }

      // If event date is TODAY
      if (ev.endTime) {
        const [startH, startM] = (ev.startTime || '00:00').split(':').map(Number);
        const [endH, endM] = ev.endTime.split(':').map(Number);
        const isOvernight = (endH < startH) || (endH === startH && endM < startM);

        if (isOvernight) {
          // Event began today and ends tomorrow morning
          return false;
        }

        // Daytime event ending today
        const endDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 59, 999);
        return now.getTime() > endDateTime.getTime();
      }

      // Event is today with no specific end time: valid until midnight (23:59:59)
      return false;
    } catch (_) {
      return false;
    }
  }

  /**
   * Automatically deletes details about concluded events from registered (non-creator) devices.
   * Creator devices retain all event details, analytics, and check-in records intact.
   */
  function purgeExpiredEventsFromRegisteredDevices() {
    let deletedEventIds = [];
    let eventsModified = false;

    // 1. Process eventhub_events
    try {
      const rawEvents = localStorage.getItem('eventhub_events');
      if (rawEvents) {
        const events = JSON.parse(rawEvents);
        if (Array.isArray(events)) {
          const preservedEvents = events.filter(function (ev) {
            const expired = isEventExpired(ev);
            const creator = isCurrentUserCreator(ev);

            // If event has concluded and this device is NOT the creator device, purge!
            if (expired && !creator) {
              if (ev.id && !deletedEventIds.includes(ev.id)) {
                deletedEventIds.push(ev.id);
              }
              eventsModified = true;
              return false;
            }
            return true;
          });

          if (eventsModified) {
            localStorage.setItem('eventhub_events', JSON.stringify(preservedEvents));
          }
        }
      }
    } catch (_) {}

    // 2. Process eventhub_registrations
    try {
      const rawRegs = localStorage.getItem('eventhub_registrations');
      if (rawRegs) {
        const regMap = JSON.parse(rawRegs);
        let regModified = false;
        const lastTicketId = localStorage.getItem('eventhub_last_ticket_id');

        let remainingEvents = [];
        try {
          remainingEvents = JSON.parse(localStorage.getItem('eventhub_events') || '[]');
        } catch (_) {}

        for (const [key, pass] of Object.entries(regMap)) {
          if (!pass) continue;
          const targetEventId = pass.eventId || key;

          let ev = remainingEvents.find(function (e) { return e.id === targetEventId; });
          if (!ev && (pass.eventDate || pass.date)) {
            ev = {
              id: targetEventId,
              date: pass.eventDate || pass.date,
              startTime: pass.eventTime || pass.startTime,
              endTime: pass.endTime || null,
              creatorEmail: pass.creatorEmail,
              creatorId: pass.creatorId
            };
          }

          const isAlreadyDeleted = deletedEventIds.includes(targetEventId);
          const expired = ev ? isEventExpired(ev) : isAlreadyDeleted;
          const creator = ev ? isCurrentUserCreator(ev) : false;

          if (isAlreadyDeleted || (expired && !creator)) {
            if (lastTicketId && (lastTicketId === pass.ticketId || lastTicketId === key)) {
              localStorage.removeItem('eventhub_last_ticket_id');
            }
            delete regMap[key];
            regModified = true;
            if (targetEventId && !deletedEventIds.includes(targetEventId)) {
              deletedEventIds.push(targetEventId);
            }
          }
        }

        if (regModified) {
          localStorage.setItem('eventhub_registrations', JSON.stringify(regMap));
        }
      }
    } catch (_) {}

    // 3. Broadcast purge event across active tabs
    if (deletedEventIds.length > 0) {
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const ch = new BroadcastChannel('eventhub_sync');
          ch.postMessage({ type: 'expired_events_purged', deletedEventIds: deletedEventIds });
        }
      } catch (_) {}
    }

    return deletedEventIds;
  }

  // Auto-run on startup & hook listeners
  if (typeof window !== 'undefined') {
    // Immediate execution
    try { purgeExpiredEventsFromRegisteredDevices(); } catch (_) {}

    // Run on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        purgeExpiredEventsFromRegisteredDevices();
      });
    }

    // Periodic background timer (runs every 30 seconds to catch expired events as time passes)
    setInterval(function () {
      purgeExpiredEventsFromRegisteredDevices();
    }, 30000);

    // Cross-tab synchronization
    window.addEventListener('storage', function (e) {
      if (e.key === 'eventhub_events' || e.key === 'eventhub_registrations') {
        purgeExpiredEventsFromRegisteredDevices();
      }
    });

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const syncChannel = new BroadcastChannel('eventhub_sync');
        syncChannel.addEventListener('message', function (e) {
          if (e.data && e.data.type === 'expired_events_purged') {
            // Trigger local re-render if handler is available
            if (typeof window.onEventHubPurge === 'function') {
              window.onEventHubPurge(e.data.deletedEventIds);
            }
          }
        });
      } catch (_) {}
    }
  }

  return {
    isCurrentUserCreator: isCurrentUserCreator,
    isEventExpired: isEventExpired,
    purgeExpiredEventsFromRegisteredDevices: purgeExpiredEventsFromRegisteredDevices
  };
});
