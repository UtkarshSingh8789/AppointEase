import React, { useEffect, useState } from "react";
import { Calendar, Clock, Check, X } from "lucide-react";
import { useAppointmentStore } from "@/store/appointmentStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { PageTransition } from "@/components/layout/PageTransition";
import { formatDate, formatTime } from "@/utils";

type TabType = "pending" | "confirmed" | "all";

export const AppointmentRequests: React.FC = () => {
  const {
    appointments,
    total,
    page,
    totalPages,
    isLoading,
    fetchAppointments,
    updateStatus,
  } = useAppointmentStore();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const statusByTab: Record<TabType, string | undefined> = {
    pending: "pending",
    confirmed: "confirmed",
    all: undefined,
  };

  useEffect(() => {
    fetchAppointments({ status: statusByTab[activeTab], page: 1, size: 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handlePageChange = (newPage: number) => {
    fetchAppointments({
      status: statusByTab[activeTab],
      page: newPage,
      size: 10,
    });
  };

  const handleAccept = async (id: string) => {
    await updateStatus(id, { status: "confirmed" });
    setAcceptingId(null);
    fetchAppointments({ status: statusByTab[activeTab], page, size: 10 });
  };

  const handleReject = async (id: string) => {
    await updateStatus(id, { status: "cancelled" });
    setRejectingId(null);
    fetchAppointments({ status: statusByTab[activeTab], page, size: 10 });
  };

  const handleComplete = async (id: string) => {
    await updateStatus(id, { status: "completed" });
    setCompletingId(null);
    fetchAppointments({ status: statusByTab[activeTab], page, size: 10 });
  };

  const canCancelBeforeStart = (appointmentDate: string, startTime: string) => {
    const appointmentStart = new Date(`${appointmentDate}T${startTime}`);
    return new Date() < appointmentStart;
  };

  const canCompleteAfterBuffer = (appointmentDate: string, endTime: string) => {
    const appointmentEndWithBuffer = new Date(`${appointmentDate}T${endTime}`);
    appointmentEndWithBuffer.setMinutes(
      appointmentEndWithBuffer.getMinutes() + 30,
    );
    return new Date() >= appointmentEndWithBuffer;
  };

  const isNewAppointment = (createdAt?: string) => {
    if (!createdAt) return false;
    return Date.now() - new Date(createdAt).getTime() < 1000 * 60 * 60 * 24;
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "confirmed", label: "Confirmed" },
    { key: "pending", label: "Pending" },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Appointment Requests
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage incoming appointment requests
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <LoadingSpinner size="lg" />
        ) : appointments.length === 0 ? (
          <EmptyState
            title={`No ${activeTab} appointments`}
            description="New appointment requests will appear here"
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {total} appointment{total !== 1 ? "s" : ""}
            </p>

            {appointments.map((appointment) => (
              <Card key={appointment.id} className="relative">
                {appointment.status === "pending" &&
                  isNewAppointment(appointment.created_at) && (
                    <span className="absolute right-4 top-4 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      New
                    </span>
                  )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-14">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {appointment.customer?.full_name || "Customer"}
                      </h3>
                      <Badge status={appointment.status} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(appointment.appointment_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(appointment.start_time)} -{" "}
                        {formatTime(appointment.end_time)}
                      </span>
                    </div>
                    {appointment.notes && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 italic">
                        &quot;{appointment.notes}&quot;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {appointment.status === "confirmed" && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                          disabled={
                            !canCompleteAfterBuffer(
                              appointment.appointment_date,
                              appointment.end_time,
                            )
                          }
                          onClick={() => setCompletingId(appointment.id)}
                        >
                          {canCompleteAfterBuffer(
                            appointment.appointment_date,
                            appointment.end_time,
                          )
                            ? "Mark Complete"
                            : "Complete after 30m"}
                        </Button>
                        {canCancelBeforeStart(
                          appointment.appointment_date,
                          appointment.start_time,
                        ) && (
                          <Button
                            size="sm"
                            variant="danger"
                            leftIcon={<X className="w-3.5 h-3.5" />}
                            onClick={() => setRejectingId(appointment.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Reject confirmation dialog */}
      <ConfirmDialog
        isOpen={!!acceptingId}
        onClose={() => setAcceptingId(null)}
        onConfirm={() => acceptingId && handleAccept(acceptingId)}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? The customer will be notified and their wallet will be refunded according to the cancellation rules."
        confirmLabel="Cancel Appointment"
        variant="info"
      />

      {/* Reject confirmation dialog */}
      <ConfirmDialog
        isOpen={!!rejectingId}
        onClose={() => setRejectingId(null)}
        onConfirm={() => rejectingId && handleReject(rejectingId)}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? The customer will be notified and their wallet will be refunded according to the cancellation rules."
        confirmLabel="Cancel"
        variant="danger"
      />

      {/* Complete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!completingId}
        onClose={() => setCompletingId(null)}
        onConfirm={() => completingId && handleComplete(completingId)}
        title="Mark as Completed"
        message="Are you sure this appointment has been completed? This will notify the customer and allow them to leave a review."
        confirmLabel="Mark Complete"
        variant="info"
      />
    </PageTransition>
  );
};
