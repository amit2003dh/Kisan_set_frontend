import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function DeliveryPartnerRegistration() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    gender: "",
    vehicleType: "motorcycle",
    vehicleNumber: "",
    licenseNumber: "",
    experience: "",
    serviceArea: {
      cities: [],
      maxDistance: 10
    },
    address: {
      street: "",
      city: "",
      state: "",
      pincode: "",
      lat: "",
      lng: ""
    },
    idProof: {
      type: "aadhaar",
      number: "",
      frontImage: null,
      backImage: null
    },
    bankAccount: {
      accountNumber: "",
      accountHolderName: "",
      bankName: "",
      ifscCode: "",
      branchName: ""
    },
    emergencyContact: {
      name: "",
      phone: "",
      relationship: ""
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
      startTime: "09:00",
      endTime: "18:00"
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const navigate = useNavigate();

  // Check application status on component mount
  useEffect(() => {
    const checkApplicationStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please login to submit a delivery partner application");
          setCheckingStatus(false);
          return;
        }

        const { data, error: statusError } = await apiCall(() =>
          API.get("/delivery-partner/application-status")
        );

        if (statusError) {
          if (statusError.includes("Your application is currently")) {
            setApplicationStatus("pending");
            setError(statusError);
          } else {
            setError(statusError);
          }
        } else if (data) {
          setApplicationStatus(data.applicationStatus);
          if (data.hasApplied) {
            setError(`You already have an application with status: ${data.applicationStatus}`);
          }
        }
      } catch (err) {
        console.error("Error checking application status:", err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkApplicationStatus();
  }, []);

  const cities = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
    "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur",
    "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna",
    "Vadodara", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot",
    "Kalyan-Dombivli", "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad",
    "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah",
    "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai",
    "Raipur", "Kota", "Guwahati", "Chandigarh", "Hubli-Dharwad", "Mysore",
    "Tiruchirappalli", "Thiruvananthapuram", "Salem", "Tiruppur", "Gurgaon",
    "Bikaner", "Gwalior", "Warangal", "Nellore", "Pondicherry", "Jammu"
  ];

  const vehicleTypes = [
    { value: "motorcycle", label: "🏍️ Motorcycle", capacity: "Small packages" },
    { value: "scooter", label: "🛵 Scooter", capacity: "Small packages" },
    { value: "car", label: "🚗 Car", capacity: "Medium packages" },
    { value: "van", label: "🚐 Van", capacity: "Large packages" },
    { value: "pickup", label: "🚚 Pickup Truck", capacity: "Very large packages" }
  ];

  const idProofTypes = [
    { value: "aadhaar", label: "Aadhaar Card" },
    { value: "pan", label: "PAN Card" },
    { value: "voter", label: "Voter ID" },
    { value: "driving", label: "Driving License" },
    { value: "passport", label: "Passport" }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      if (name === "serviceArea.cities") {
        setFormData(prev => ({
          ...prev,
          serviceArea: {
            ...prev.serviceArea,
            cities: checked 
              ? [...(Array.isArray(prev.serviceArea.cities) ? prev.serviceArea.cities : []), value]
              : (Array.isArray(prev.serviceArea.cities) ? prev.serviceArea.cities.filter(city => city !== value) : [])
          }
        }));
      } else if (type === "checkbox") {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: checked
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formDataToSend = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (key === "serviceArea" || key === "address" || key === "idProof" || 
            key === "bankAccount" || key === "emergencyContact" || key === "availability") {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (key === "idProof" && typeof formData[key] === 'object') {
          // Handle nested idProof object
          Object.keys(formData[key]).forEach(subKey => {
            if (subKey === "frontImage" || subKey === "backImage") {
              if (formData[key][subKey]) {
                formDataToSend.append(`idProof.${subKey}`, formData[key][subKey]);
              }
            } else {
              formDataToSend.append(`idProof.${subKey}`, formData[key][subKey]);
            }
          });
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      const { data, error: err } = await apiCall(() =>
        API.post("/delivery-partner/register", formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
      );

      if (err) {
        setError(err);
      } else {
        setSuccess("Registration submitted successfully! Your application is now pending admin verification. You will receive an email once your account is approved.");
        
        // Refresh application status after successful submission
        const checkNewStatus = async () => {
          try {
            const { data: statusData } = await apiCall(() =>
              API.get("/delivery-partner/application-status")
            );
            if (statusData) {
              setApplicationStatus(statusData.applicationStatus);
            }
          } catch (statusErr) {
            console.error("Error checking new status:", statusErr);
          }
        };
        
        checkNewStatus();
        
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          age: "",
          gender: "",
          vehicleType: "motorcycle",
          vehicleNumber: "",
          licenseNumber: "",
          experience: "",
          serviceArea: {
            cities: [],
            maxDistance: 10
          },
          address: {
            street: "",
            city: "",
            state: "",
            pincode: "",
            lat: "",
            lng: ""
          },
          idProof: {
            type: "aadhaar",
            number: "",
            frontImage: null,
            backImage: null
          },
          bankAccount: {
            accountNumber: "",
            accountHolderName: "",
            bankName: "",
            ifscCode: "",
            branchName: ""
          },
          emergencyContact: {
            name: "",
            phone: "",
            relationship: ""
          },
          availability: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: true,
            startTime: "09:00",
            endTime: "18:00"
          }
        });
        setCurrentStep(1);
      }
    } catch (error) {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ marginBottom: "24px", textAlign: "center" }}>🚚 Personal Information</h2>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter your email"
                required
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter your phone number"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Age *</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Your age"
                  min="18"
                  max="65"
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-control"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Experience (years) *</label>
              <input
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                className="form-control"
                placeholder="Years of delivery experience"
                min="0"
                required
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ marginBottom: "24px", textAlign: "center" }}>🏍️ Vehicle Information</h2>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Vehicle Type *</label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="form-control"
                required
              >
                {vehicleTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.capacity}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Vehicle Number *</label>
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g., MH-12-AB-1234"
                required
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Driving License Number *</label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter your driving license number"
                required
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Service Area Details</label>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Cities you can serve in:</label>
                <div style={{ maxHeight: "120px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "4px", padding: "8px" }}>
                  {cities.map(city => (
                    <label key={city} style={{ display: "block", marginBottom: "4px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        name="serviceArea.cities"
                        value={city}
                        checked={Array.isArray(formData.serviceArea.cities) && formData.serviceArea.cities.includes(city)}
                        onChange={handleChange}
                        style={{ marginRight: "8px" }}
                      />
                      {city}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Maximum Service Distance (km):</label>
                <input
                  type="number"
                  name="serviceArea.maxDistance"
                  value={formData.serviceArea.maxDistance}
                  onChange={handleChange}
                  className="form-control"
                  min="1"
                  max="50"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ marginBottom: "24px", textAlign: "center" }}>📍 Address Information</h2>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Street Address *</label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter your street address"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>City *</label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>State *</label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="State"
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Pincode *</label>
                <input
                  type="text"
                  name="address.pincode"
                  value={formData.address.pincode}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Pincode"
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Emergency Contact *</label>
                <input
                  type="tel"
                  name="emergencyContact.phone"
                  value={formData.emergencyContact.phone}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Emergency contact number"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Emergency Contact Name *</label>
              <input
                type="text"
                name="emergencyContact.name"
                value={formData.emergencyContact.name}
                onChange={handleChange}
                className="form-control"
                placeholder="Emergency contact name"
                required
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Relationship *</label>
              <input
                type="text"
                name="emergencyContact.relationship"
                value={formData.emergencyContact.relationship}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g., Spouse, Parent, Friend"
                required
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ marginBottom: "24px", textAlign: "center" }}>🆔 ID Proof & Bank Details</h2>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>ID Proof Type *</label>
              <select
                name="idProof.type"
                value={formData.idProof.type}
                onChange={handleChange}
                className="form-control"
                required
              >
                {idProofTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>ID Proof Number *</label>
              <input
                type="text"
                name="idProof.number"
                value={formData.idProof.number}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter your ID proof number"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>ID Proof Front Image *</label>
                <input
                  type="file"
                  name="idProof.frontImage"
                  onChange={handleFileChange}
                  className="form-control"
                  accept="image/*"
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>ID Proof Back Image *</label>
                <input
                  type="file"
                  name="idProof.backImage"
                  onChange={handleFileChange}
                  className="form-control"
                  accept="image/*"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Bank Account Number *</label>
              <input
                type="text"
                name="bankAccount.accountNumber"
                value={formData.bankAccount.accountNumber}
                onChange={handleChange}
                className="form-control"
                placeholder="Your bank account number"
                required
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Account Holder Name *</label>
              <input
                type="text"
                name="bankAccount.accountHolderName"
                value={formData.bankAccount.accountHolderName}
                onChange={handleChange}
                className="form-control"
                placeholder="Name as per bank records"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Bank Name *</label>
                <input
                  type="text"
                  name="bankAccount.bankName"
                  value={formData.bankAccount.bankName}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Bank name"
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>IFSC Code *</label>
                <input
                  type="text"
                  name="bankAccount.ifscCode"
                  value={formData.bankAccount.ifscCode}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="IFSC code"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Branch Name *</label>
              <input
                type="text"
                name="bankAccount.branchName"
                value={formData.bankAccount.branchName}
                onChange={handleChange}
                className="form-control"
                placeholder="Bank branch name"
                required
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ marginBottom: "24px", textAlign: "center" }}>⏰ Availability</h2>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Available Days:</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                  <label key={day} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name={`availability.${day}`}
                      checked={formData.availability[day]}
                      onChange={handleChange}
                      style={{ marginRight: "4px" }}
                    />
                    <span style={{ textTransform: "capitalize" }}>{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Start Time *</label>
                <input
                  type="time"
                  name="availability.startTime"
                  value={formData.availability.startTime}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>End Time *</label>
                <input
                  type="time"
                  name="availability.endTime"
                  value={formData.availability.endTime}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div style={{ background: "var(--background-alt)", padding: "16px", borderRadius: "8px", marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 12px 0", color: "var(--primary-blue)" }}>📋 Review Your Application</h3>
              <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Phone:</strong> {formData.phone}</p>
                <p><strong>Vehicle:</strong> {formData.vehicleType} - {formData.vehicleNumber}</p>
                <p><strong>Service Cities:</strong> {Array.isArray(formData.serviceArea.cities) ? formData.serviceArea.cities.join(", ") : "None"}</p>
                <p><strong>Experience:</strong> {formData.experience} years</p>
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px" }}>
                <input
                  type="checkbox"
                  required
                  style={{ marginRight: "8px" }}
                />
                I confirm that all the information provided is accurate and I agree to the terms and conditions
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header" style={{ marginBottom: "32px", textAlign: "center" }}>
        <h1>🚚 Delivery Partner Registration</h1>
        <p>Join our delivery network and start earning today!</p>
      </div>

      {checkingStatus ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Checking your application status...</p>
        </div>
      ) : applicationStatus === "pending" ? (
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ marginBottom: "24px", color: "var(--primary-blue)" }}>⏳ Application Under Review</h2>
          <div style={{ background: "var(--background-alt)", padding: "20px", borderRadius: "8px", marginBottom: "24px" }}>
            <p style={{ fontSize: "16px", marginBottom: "16px" }}>
              Your delivery partner application is currently under review. We'll notify you once there's an update.
            </p>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Status: <strong>pending</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <Link to="/" className="btn btn-outline">
              Back to Home
            </Link>
          </div>
        </div>
      ) : applicationStatus === "approved" ? (
        <>
          {(() => {
            // Auto redirect to dashboard
            navigate("/delivery-partner/dashboard");
            return null;
          })()}
        </>
      ) : applicationStatus === "rejected" ? (
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ marginBottom: "24px", color: "var(--primary-blue)" }}>❌ Application Rejected</h2>
          <div style={{ background: "var(--background-alt)", padding: "20px", borderRadius: "8px", marginBottom: "24px" }}>
            <p style={{ fontSize: "16px", marginBottom: "16px" }}>
              Your application was not approved. You can reapply with updated information.
            </p>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Status: <strong>rejected</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <button
              onClick={() => setApplicationStatus(null)}
              className="btn btn-primary"
            >
              Reapply Now
            </button>
            <Link to="/" className="btn btn-outline">
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        <>
          {error && <div className="error-message" style={{ marginBottom: "16px" }}>{error}</div>}
          {success && <div className="success-message" style={{ marginBottom: "16px" }}>{success}</div>}

          {/* Progress Bar */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Step {currentStep} of 5</span>
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                {currentStep === 1 && "Personal Info"}
                {currentStep === 2 && "Vehicle Info"}
                {currentStep === 3 && "Address"}
                {currentStep === 4 && "Documents"}
                {currentStep === 5 && "Review & Submit"}
              </span>
            </div>
            <div style={{ height: "8px", background: "var(--border-color)", borderRadius: "4px", overflow: "hidden" }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: `${(currentStep / 5) * 100}%`, 
                  background: "var(--primary-blue)", 
                  transition: "width 0.3s ease" 
                }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {renderStep()}

            {/* Navigation Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
              <button
                type="button"
                onClick={prevStep}
                className="btn btn-outline"
                disabled={currentStep === 1}
                style={{ visibility: currentStep === 1 ? "hidden" : "visible" }}
              >
                ← Previous
              </button>
              
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn btn-primary"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
