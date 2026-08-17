import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { bookingAPI, providerAPI } from '../../services/api';
import Card from '../../components/Card';
import { Calendar, Clock, MapPin, Check, ToggleLeft, ToggleRight, Sparkles, User, AlertCircle } from 'lucide-react';
import { format, isToday, isTomorrow, isAfter, startOfDay } from 'date-fns';

export default function ProviderSchedule() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await bookingAPI.getUserBookings();
      const list = Array.isArray(res.data) ? res.data : [];
      setBookings(list);

      if (user && user.availability !== undefined) {
        setAvailability(user.availability);
      }
    } catch (err) {
      console.error('Failed to load schedule', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      setToggling(true);
      const nextAvailability = !availability;
      await providerAPI.toggleAvailability({ availability: nextAvailability });
      setAvailability(nextAvailability);
    } catch (err) {
      console.error('Failed to toggle availability', err);
    } finally {
      setToggling(false);
    }
  };

  // Schedule filtering
  const validBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'declined');
  
  const todaySchedule = validBookings
    .filter(b => b.booking_date && isToday(new Date(b.booking_date)))
    .sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date));

  const upcomingSchedule = validBookings
    .filter(b => b.booking_date && isAfter(new Date(b.booking_date), startOfDay(new Date())) && !isToday(new Date(b.booking_date)))
    .sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date));

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Work Schedule</h1>
            <p className="text-gray-500 font-medium text-sm mt-1">Manage your daily appointments and availability</p>
          </div>

          {/* Toggle Availability Card */}
          <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm flex items-center gap-4">
            <div>
              <div className="text-xs font-bold text-gray-900">Current Status</div>
              <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${availability ? 'bg-[#10b981]' : 'bg-red-400'}`}></span>
                {availability ? 'Accepting Requests' : 'Offline / Unavailable'}
              </div>
            </div>
            <button
              onClick={handleToggleAvailability}
              disabled={toggling}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all text-white ${
                availability ? 'bg-[#10b981] hover:bg-[#0ea572]' : 'bg-gray-700 hover:bg-gray-800'
              }`}
            >
              {availability ? 'Set Offline' : 'Go Online'}
            </button>
          </div>
        </div>

        {/* Grid: Today's Timeline + Upcoming */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 2 Cols: Today's Schedule */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#07535f]" />
                  Today's Schedule
                </h2>
                <span className="text-xs font-semibold bg-[#07535f]/10 text-[#07535f] px-3 py-1 rounded-full">
                  {format(new Date(), 'EEEE, dd MMM yyyy')}
                </span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-sm text-gray-400">Loading schedule...</div>
              ) : todaySchedule.length === 0 ? (
                <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-600">No appointments scheduled for today</p>
                  <p className="text-xs text-gray-400 mt-1">New accepted bookings for today will appear here.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-[#07535f]/20 ml-4 pl-6 space-y-8">
                  {todaySchedule.map((item) => (
                    <div key={item.id} className="relative group">
                      {/* Node indicator */}
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#07535f] ring-4 ring-white"></div>

                      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-extrabold text-[#07535f] bg-[#07535f]/10 px-2.5 py-1 rounded-lg">
                            {format(new Date(item.booking_date), 'hh:mm a')}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {item.status.replaceAll('_', ' ')}
                          </span>
                        </div>

                        <h3 className="font-bold text-gray-900 text-base mt-2">{item.service_category || 'Home Service'}</h3>

                        <div className="text-xs text-gray-500 space-y-1 mt-2 bg-gray-50 p-2.5 rounded-xl">
                          <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gray-400" /> {item.customer_name || 'Customer'}</p>
                          <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {item.location || 'Pokhara'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Col: Upcoming Schedule */}
          <div className="space-y-6">
            <Card className="p-6 border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Upcoming Jobs
              </h2>

              {loading ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
              ) : upcomingSchedule.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No upcoming jobs scheduled yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingSchedule.map((item) => (
                    <div key={item.id} className="p-3.5 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-all space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-900">{item.service_category || 'Service'}</span>
                        <span className="text-gray-500 font-semibold">{format(new Date(item.booking_date), 'MMM d, h:mm a')}</span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" /> {item.location || 'Kathmandu'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Working Hours Info Card */}
            <Card className="p-5 border-gray-100 bg-indigo-50/50">
              <h3 className="font-bold text-indigo-900 text-sm mb-2">Standard Service Hours</h3>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Standard booking slots run from <strong>8:00 AM to 7:00 PM</strong> daily. Toggle your status to offline whenever you are unavailable.
              </p>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
